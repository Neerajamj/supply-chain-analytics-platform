
import os
import sqlite3
from pathlib import Path
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    text,
)
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# --------------------------------------------------
# Configuration
# --------------------------------------------------

ROOT = Path(__file__).resolve().parents[2]
SQLITE_FILE = ROOT / "backend" / "flowops.db"

TABLES = [
    "users",
    "warehouses",
    "products",
    "inventory",
    "orders",
]


# --------------------------------------------------
# Existing application database models
# Defined here to avoid importing app.main.
# --------------------------------------------------

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str]
    role: Mapped[str] = mapped_column(String(40))


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    city: Mapped[str]
    capacity: Mapped[int]
    occupied: Mapped[int]
    employees: Mapped[int]
    daily_orders: Mapped[int]


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str]
    category: Mapped[str]
    supplier: Mapped[str]
    price: Mapped[float] = mapped_column(Float)
    min_stock: Mapped[int]
    max_stock: Mapped[int]
    reorder_level: Mapped[int]


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id")
    )
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id")
    )
    current_stock: Mapped[int]

    product: Mapped[Product] = relationship()
    warehouse: Mapped[Warehouse] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    customer: Mapped[str]
    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id")
    )
    partner: Mapped[str]
    order_value: Mapped[float]
    order_date: Mapped[datetime] = mapped_column(DateTime)
    delivery_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    status: Mapped[str]

    warehouse: Mapped[Warehouse] = relationship()


# --------------------------------------------------
# Migration
# --------------------------------------------------

def main():
    raw_url = os.environ.get("NEON_DATABASE_URL")

    if not raw_url:
        raise SystemExit(
            "ERROR: NEON_DATABASE_URL is not set in this PowerShell session."
        )

    url = make_url(raw_url)

    if url.get_backend_name() != "postgresql":
        raise SystemExit(
            "ERROR: NEON_DATABASE_URL must be a PostgreSQL connection URL."
        )

    # Use the installed Psycopg 3 driver.
    url = url.set(drivername="postgresql+psycopg")

    if not SQLITE_FILE.is_file():
        raise SystemExit(
            f"ERROR: SQLite database not found: {SQLITE_FILE}"
        )

    print(f"SQLite source: {SQLITE_FILE}")
    print("Connecting to Neon PostgreSQL...")

    source = sqlite3.connect(
        SQLITE_FILE.as_uri() + "?mode=ro",
        uri=True,
    )
    source.row_factory = sqlite3.Row

    target = create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 15},
    )

    try:
        # Confirm connectivity and require an empty destination.
        with target.connect() as conn:
            print("Neon connection successful.")

            existing_tables = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name IN (
                      'users',
                      'warehouses',
                      'products',
                      'inventory',
                      'orders'
                  )
            """)).scalars().all()

            if existing_tables:
                raise SystemExit(
                    "STOP: Project tables already exist in Neon: "
                    + ", ".join(sorted(existing_tables))
                    + ". No migration was performed. "
                    "Inspect the destination before continuing."
                )

        # Create the schema on Neon.
        print("Creating PostgreSQL tables from the models...")
        Base.metadata.create_all(bind=target)

        # Read expected source counts before copying.
        expected_counts = {}

        for table in TABLES:
            expected_counts[table] = source.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            ).fetchone()[0]

        print("\nSource row counts:")
        for table, count in expected_counts.items():
            print(f"  {table}: {count}")

        # Copy data in foreign-key dependency order.
        # All inserts and verification run in one transaction.
        with target.begin() as conn:
            for table in TABLES:
                rows = source.execute(
                    f'SELECT * FROM "{table}" ORDER BY id'
                ).fetchall()

                if rows:
                    columns = list(rows[0].keys())

                    column_sql = ", ".join(
                        f'"{column}"' for column in columns
                    )
                    value_sql = ", ".join(
                        f":{column}" for column in columns
                    )

                    statement = text(
                        f'INSERT INTO "{table}" '
                        f"({column_sql}) VALUES ({value_sql})"
                    )

                    conn.execute(
                        statement,
                        [dict(row) for row in rows],
                    )

                print(f"Copied {table}: {len(rows)} rows")

            # Verify row counts before committing.
            print("\nVerifying row counts...")

            for table in TABLES:
                actual = conn.execute(
                    text(f'SELECT COUNT(*) FROM "{table}"')
                ).scalar_one()

                expected = expected_counts[table]

                if actual != expected:
                    raise RuntimeError(
                        f"Row count mismatch in {table}: "
                        f"SQLite={expected}, Neon={actual}"
                    )

                print(f"  PASS {table}: {actual} rows")

            # Verify inventory foreign keys.
            bad_inventory = conn.execute(text("""
                SELECT COUNT(*)
                FROM inventory AS i
                LEFT JOIN products AS p
                    ON p.id = i.product_id
                LEFT JOIN warehouses AS w
                    ON w.id = i.warehouse_id
                WHERE p.id IS NULL OR w.id IS NULL
            """)).scalar_one()

            # Verify order foreign keys.
            bad_orders = conn.execute(text("""
                SELECT COUNT(*)
                FROM orders AS o
                LEFT JOIN warehouses AS w
                    ON w.id = o.warehouse_id
                WHERE w.id IS NULL
            """)).scalar_one()

            if bad_inventory != 0 or bad_orders != 0:
                raise RuntimeError(
                    "Foreign-key validation failed: "
                    f"inventory={bad_inventory}, orders={bad_orders}"
                )

            print("  PASS inventory foreign keys")
            print("  PASS order foreign keys")

            # Synchronize PostgreSQL ID sequences to imported IDs.
            for table in TABLES:
                max_id = conn.execute(
                    text(f'SELECT MAX(id) FROM "{table}"')
                ).scalar_one()

                sequence_name = conn.execute(
                    text("""
                        SELECT pg_get_serial_sequence(
                            :qualified_table,
                            'id'
                        )
                    """),
                    {"qualified_table": f"public.{table}"},
                ).scalar_one()

                if sequence_name is not None and max_id is not None:
                    conn.execute(
                        text("""
                            SELECT setval(
                                CAST(:sequence_name AS regclass),
                                :max_id,
                                true
                            )
                        """),
                        {
                            "sequence_name": sequence_name,
                            "max_id": max_id,
                        },
                    )

        # Reaching this point means the transaction committed.
        print("\nSUCCESS: Migration committed.")
        print("All five table counts match SQLite.")
        print("Foreign-key validation passed.")
        print("ID sequences checked and synchronized.")
        print("\nExpected total: 10,505 rows.")
        print("Your SQLite source database was not modified.")

    finally:
        source.close()
        target.dispose()


if __name__ == "__main__":
    main()
