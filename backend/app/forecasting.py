"""Demand forecasting service using a Random Forest regression model."""
from datetime import timedelta
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

def _features(day: pd.Timestamp, lag_1: float, lag_7: float, avg_7: float) -> dict:
    return {
        'day_of_week': day.dayofweek,
        'day_of_month': day.day,
        'month': day.month,
        'week_of_year': int(day.isocalendar().week),
        'lag_1': lag_1,
        'lag_7': lag_7,
        'rolling_mean_7': avg_7,
    }

def forecast_order_demand(order_dates: list, horizon: int = 30) -> list[dict]:
    """Train on daily historical order counts and recursively forecast future demand.

    Calendar features capture seasonality, while lag and rolling-average features give
    the model recent demand context. A deterministic seed makes demo outputs repeatable.
    """
    dates = pd.to_datetime(order_dates, utc=True)
    if len(dates) < 14:
        return []
    history = pd.Series(1, index=dates).resample('D').sum().asfreq('D', fill_value=0).astype(float)
    training = []
    for position in range(7, len(history)):
        day = history.index[position]
        training.append({**_features(day, history.iloc[position - 1], history.iloc[position - 7], history.iloc[position - 7:position].mean()), 'target': history.iloc[position]})
    frame = pd.DataFrame(training)
    feature_columns = [column for column in frame.columns if column != 'target']
    model = RandomForestRegressor(n_estimators=150, max_depth=10, min_samples_leaf=2, random_state=42, n_jobs=-1)
    model.fit(frame[feature_columns], frame['target'])
    values = list(history.values)
    next_day = history.index[-1] + timedelta(days=1)
    forecasts = []
    for _ in range(horizon):
        row = _features(next_day, values[-1], values[-7], sum(values[-7:]) / 7)
        prediction = max(0, round(float(model.predict(pd.DataFrame([row])[feature_columns])[0])))
        forecasts.append({'date': next_day.date().isoformat(), 'predicted_demand': prediction})
        values.append(prediction)
        next_day += timedelta(days=1)
    return forecasts
