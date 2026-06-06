import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import calendar

# Parameters
start_date = datetime(2026, 6, 6)
months_to_generate = 18
base_rate = 30
variance = 0.15

dates = []

# Generate dates month by month
current_year = start_date.year
current_month = start_date.month

for _ in range(months_to_generate):
    # Determine number of planes for this month (30 +/- 15%)
    min_planes = int(base_rate * (1 - variance))
    max_planes = int(base_rate * (1 + variance))
    num_planes = np.random.randint(min_planes, max_planes + 1)

    # Days in the current month
    days_in_month = calendar.monthrange(current_year, current_month)[1]

    # Generate random days in this month
    for _ in range(num_planes):
        # Ensure we don't pick days before the start date in the very first month
        start_day = start_date.day if (current_year == start_date.year and current_month == start_date.month) else 1
        random_day = np.random.randint(start_day, days_in_month + 1)
        dates.append(datetime(current_year, current_month, random_day))

    # Move to next month
    current_month += 1
    if current_month > 12:
        current_month = 1
        current_year += 1

# Sort dates so MSN is chronological
dates.sort()

# Assign MSNs
start_msn = 12000
msns = [start_msn + i for i in range(len(dates))]

# Format dates to DD.MM.YYYY
formatted_dates = [d.strftime('%d.%m.%Y') for d in dates]

# Create DataFrame
df_prod = pd.DataFrame({
    'MSN': msns,
    'Datum': formatted_dates
})

# Save to CSV
file_name = 'Produktionsplanungsdaten.csv'
df_prod.to_csv(file_name, index=False, sep=';')

# Output basic info to show user
print(f"Total records generated: {len(df_prod)}")
print(df_prod.head(5).to_string())
print("...")
print(df_prod.tail(5).to_string())
