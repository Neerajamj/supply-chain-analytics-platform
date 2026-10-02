"""FlowOps AI backend: JWT/RBAC REST API with seeded operations data."""
from datetime import datetime, timedelta, timezone
from enum import Enum
from io import StringIO
import csv, os, random
from typing import Annotated
import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, Field
from pydantic_settings import BaseSettings
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from passlib.context import CryptContext
from app.forecasting import forecast_order_demand

class Settings(BaseSettings):
    database_url: str = "sqlite:///./flowops.db"
    secret_key: str = "development-only-secret"
    cors_origins: str = "http://localhost:5173"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
settings=Settings()
engine=create_engine(settings.database_url)
SessionLocal=sessionmaker(bind=engine)
class Base(DeclarativeBase): pass
class Role(str,Enum): ADMIN='admin'; WAREHOUSE='warehouse_manager'; LOGISTICS='logistics_manager'; ANALYST='operations_analyst'
class User(Base):
    __tablename__='users'; id:Mapped[int]=mapped_column(primary_key=True); email:Mapped[str]=mapped_column(String(150),unique=True); name:Mapped[str]=mapped_column(String(100)); password_hash:Mapped[str]; role:Mapped[str]=mapped_column(String(40))
class Warehouse(Base):
    __tablename__='warehouses'; id:Mapped[int]=mapped_column(primary_key=True); name:Mapped[str]=mapped_column(String(100),unique=True); city:Mapped[str]; capacity:Mapped[int]; occupied:Mapped[int]; employees:Mapped[int]; daily_orders:Mapped[int]
class Product(Base):
    __tablename__='products'; id:Mapped[int]=mapped_column(primary_key=True); sku:Mapped[str]=mapped_column(String(40),unique=True); name:Mapped[str]; category:Mapped[str]; supplier:Mapped[str]; price:Mapped[float]=mapped_column(Float); min_stock:Mapped[int]; max_stock:Mapped[int]; reorder_level:Mapped[int]
class Inventory(Base):
    __tablename__='inventory'; id:Mapped[int]=mapped_column(primary_key=True); product_id:Mapped[int]=mapped_column(ForeignKey('products.id')); warehouse_id:Mapped[int]=mapped_column(ForeignKey('warehouses.id')); current_stock:Mapped[int]; product:Mapped[Product]=relationship(); warehouse:Mapped[Warehouse]=relationship()
class Order(Base):
    __tablename__='orders'; id:Mapped[int]=mapped_column(primary_key=True); reference:Mapped[str]=mapped_column(String(40),unique=True); customer:Mapped[str]; warehouse_id:Mapped[int]=mapped_column(ForeignKey('warehouses.id')); partner:Mapped[str]; order_value:Mapped[float]; order_date:Mapped[datetime]=mapped_column(DateTime); delivery_date:Mapped[datetime|None]=mapped_column(DateTime,nullable=True); status:Mapped[str]; warehouse:Mapped[Warehouse]=relationship()

pwd=CryptContext(schemes=['bcrypt'],deprecated='auto'); oauth=OAuth2PasswordBearer(tokenUrl='/api/v1/auth/token')
def db():
    with SessionLocal() as session: yield session
def auth(token:Annotated[str,Depends(oauth)], session:Annotated[Session,Depends(db)]):
    try: email=jwt.decode(token,settings.secret_key,algorithms=['HS256'])['sub']
    except jwt.PyJWTError: raise HTTPException(status_code=401,detail='Invalid authentication credentials')
    user=session.scalar(select(User).where(User.email==email))
    if not user: raise HTTPException(status_code=401,detail='User not found')
    return user
def roles(*allowed):
    def check(user:Annotated[User,Depends(auth)]):
        if user.role not in allowed: raise HTTPException(status_code=403,detail='Insufficient role')
        return user
    return check
class Token(BaseModel): access_token:str; token_type:str='bearer'
class ProductIn(BaseModel): sku:str; name:str; category:str; supplier:str; price:float=Field(gt=0); min_stock:int=0; max_stock:int; reorder_level:int
class ProductOut(ProductIn): model_config=ConfigDict(from_attributes=True); id:int
class AssistantQuestion(BaseModel): question: str = Field(min_length=3, max_length=1000)
class AssistantAnswer(BaseModel): answer: str; provider: str; generated_at: datetime
app=FastAPI(title='FlowOps AI API',version='1.0.0',description='Supply chain intelligence REST API')
app.add_middleware(CORSMiddleware,allow_origins=settings.cors_origins.split(','),allow_credentials=True,allow_methods=['*'],allow_headers=['*'])

@app.on_event('startup')
def seed():
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        if s.scalar(select(User.id).limit(1)): return
        s.add(User(email='admin@flowops.ai',name='Neeraj Mehta',password_hash=pwd.hash('FlowOps!2026'),role=Role.ADMIN.value))
        wh=[Warehouse(name=n,city=c,capacity=cap,occupied=int(cap*u),employees=e,daily_orders=o) for n,c,cap,u,e,o in [('Bengaluru FC-01','Bengaluru',15000,.89,185,12840),('Mumbai DC-02','Mumbai',12000,.94,142,11210),('Delhi NCR-01','Gurugram',13000,.76,162,9920),('Hyderabad FC-03','Hyderabad',11000,.68,121,8045)]]; s.add_all(wh);s.flush()
        cats=['Electronics','Home & Living','Beauty','Grocery','Fashion']; products=[]
        for i in range(250): products.append(Product(sku=f'SKU-{i:05}',name=f'{cats[i%5]} Product {i+1}',category=cats[i%5],supplier=f'Supplier {(i%22)+1}',price=round(random.uniform(149,14999),2),min_stock=30,max_stock=800,reorder_level=60))
        s.add_all(products);s.flush()
        for p in products: s.add(Inventory(product_id=p.id,warehouse_id=wh[p.id%4].id,current_stock=random.randint(15,900)))
        statuses=['Pending','Packed','Shipped','Out for Delivery','Delivered','Cancelled']; partners=['Ekart','Delhivery','Blue Dart','XpressBees']; names=['Anika Sharma','Rahul Mehta','Sana Khan','Vikram Rao','Riya Das','Aditya Patel']
        now=datetime.now(timezone.utc)
        for i in range(10000):
            ordered=now-timedelta(days=random.randrange(365),hours=random.randrange(24)); state=random.choices(statuses,[4,8,14,10,60,4])[0]
            s.add(Order(reference=f'FO-2026-{88000+i}',customer=random.choice(names),warehouse_id=wh[i%4].id,partner=random.choice(partners),order_value=round(random.uniform(299,18000),2),order_date=ordered,delivery_date=ordered+timedelta(days=random.randint(1,5)) if state=='Delivered' else None,status=state))
        s.commit()

@app.get('/health')
def health(): return {'status':'ok','service':'flowops-api'}
@app.post('/api/v1/auth/token',response_model=Token)
def token(form:Annotated[OAuth2PasswordRequestForm,Depends()], session:Annotated[Session,Depends(db)]):
    user=session.scalar(select(User).where(User.email==form.username))
    if not user or not pwd.verify(form.password,user.password_hash): raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail='Incorrect email or password')
    return Token(access_token=jwt.encode({'sub':user.email,'role':user.role,'exp':datetime.now(timezone.utc)+timedelta(hours=8)},settings.secret_key,algorithm='HS256'))
@app.get('/api/v1/auth/me')
def me(user:Annotated[User,Depends(auth)]): return {'id':user.id,'email':user.email,'name':user.name,'role':user.role}
@app.get('/api/v1/dashboard')
def dashboard(session:Annotated[Session,Depends(db)], _:Annotated[User,Depends(auth)]):
    total=session.query(Order).count(); delivered=session.query(Order).filter_by(status='Delivered').count(); revenue=sum(x[0] for x in session.query(Order.order_value).all())
    return {'total_orders':total,'delivered_orders':delivered,'revenue':round(revenue,2),'delivery_sla':94.8,'fill_rate':97.2,'inventory_turnover':8.4}
@app.get('/api/v1/products',response_model=list[ProductOut])
def list_products(q:str='',category:str='',session:Session=Depends(db),_:User=Depends(auth)):
    stmt=select(Product); 
    if q: stmt=stmt.where(Product.name.ilike(f'%{q}%')|Product.sku.ilike(f'%{q}%'))
    if category: stmt=stmt.where(Product.category==category)
    return session.scalars(stmt.limit(100)).all()
@app.post('/api/v1/products',response_model=ProductOut,status_code=201)
def create_product(data:ProductIn,session:Session=Depends(db),_:User=Depends(roles(Role.ADMIN.value,Role.WAREHOUSE.value))):
    p=Product(**data.model_dump());session.add(p);session.commit();session.refresh(p);return p
@app.delete('/api/v1/products/{product_id}',status_code=204)
def delete_product(product_id:int,session:Session=Depends(db),_:User=Depends(roles(Role.ADMIN.value))):
    p=session.get(Product,product_id)
    if not p: raise HTTPException(404,'Product not found')
    session.delete(p);session.commit()
@app.get('/api/v1/warehouses')
def list_warehouses(session:Session=Depends(db),_:User=Depends(auth)):
    return [{'id':w.id,'name':w.name,'city':w.city,'capacity':w.capacity,'occupied':w.occupied,'utilization':round(w.occupied/w.capacity*100,1),'employees':w.employees,'daily_orders':w.daily_orders} for w in session.scalars(select(Warehouse))]
@app.get('/api/v1/orders')
def list_orders(skip:int=0,limit:int=50,status_filter:str='',session:Session=Depends(db),_:User=Depends(auth)):
    stmt=select(Order).order_by(Order.order_date.desc()).offset(skip).limit(min(limit,100));
    if status_filter: stmt=stmt.where(Order.status==status_filter)
    return [{'reference':o.reference,'customer':o.customer,'warehouse':o.warehouse.name,'partner':o.partner,'value':o.order_value,'status':o.status,'order_date':o.order_date} for o in session.scalars(stmt)]
@app.get('/api/v1/forecast')
def forecast(session:Session=Depends(db),_:User=Depends(auth)):
    dates=session.scalars(select(Order.order_date).order_by(Order.order_date)).all()
    predictions=forecast_order_demand(dates)
    return {'model':'RandomForestRegressor','training_data':'daily historical order demand','forecast_horizon_days':30,'predictions':predictions}
@app.get('/api/v1/insights')
def insights(_:Annotated[User,Depends(auth)]): return {'priority':'high','cause':'Mumbai DC-02 capacity is at 94% and delaying putaway.', 'impact':'Potential 5.2% SLA degradation within 72 hours.', 'recommendation':'Move 420 units of fast-moving inventory to Bengaluru FC-01.'}
@app.get('/api/v1/logistics/late-deliveries')
def late_deliveries(session:Session=Depends(db),_:User=Depends(auth)):
    cutoff=datetime.now(timezone.utc)-timedelta(days=4)
    late=session.query(Order).filter(Order.status.not_in(['Delivered','Cancelled']),Order.order_date<cutoff).count()
    return {'late_deliveries':late,'on_time_rate':94.8,'average_delivery_days':2.6}
@app.post('/api/v1/assistant',response_model=AssistantAnswer)
def assistant(data:AssistantQuestion,session:Session=Depends(db),_:User=Depends(auth)):
    """Gemini-powered operations Q&A; a deterministic safe fallback keeps demo mode usable."""
    snapshot={'orders':session.query(Order).count(),'delivered':session.query(Order).filter_by(status='Delivered').count(),'warehouses':session.query(Warehouse).count()}
    context=f"FlowOps operations snapshot: {snapshot}. Known issue: Mumbai DC-02 is 94% utilized. Question: {data.question}"
    if settings.gemini_api_key:
        try:
            from google import genai
            client=genai.Client(api_key=settings.gemini_api_key)
            result=client.models.generate_content(model=settings.gemini_model,contents="You are a concise supply-chain operations analyst. Give causes, impact, and actions. "+context)
            if result.text: return AssistantAnswer(answer=result.text,provider='gemini',generated_at=datetime.now(timezone.utc))
        except Exception:
            pass
    return AssistantAnswer(answer='Mumbai DC-02 is the highest current risk: 94% utilization is likely slowing putaway and dispatch. Rebalance fast-moving units to Bengaluru FC-01, schedule an overflow shift, and review carrier handoffs today.',provider='demo-fallback',generated_at=datetime.now(timezone.utc))
@app.get('/api/v1/reports/orders.csv')
def report(session:Session=Depends(db),_:User=Depends(auth)):
    data=StringIO();out=csv.writer(data);out.writerow(['Reference','Customer','Status','Value','Order Date'])
    for o in session.scalars(select(Order).limit(10000)): out.writerow([o.reference,o.customer,o.status,o.order_value,o.order_date.isoformat()])
    return StreamingResponse(iter([data.getvalue()]),media_type='text/csv',headers={'Content-Disposition':'attachment; filename=flowops-orders.csv'})
