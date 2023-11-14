#!/bin/bash

# Update the package list to ensure we have the latest information
sudo apt update

# Install PostgreSQL and its command-line tools
sudo apt install -y postgresql postgresql-contrib

# Start the PostgreSQL service
sudo service postgresql start

# Create a PostgreSQL user and a database
echo "Creating PostgreSQL user and database..."
sudo -u postgres psql -c "CREATE USER your_username WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE your_database OWNER your_username;"

# Grant necessary privileges to the user
sudo -u postgres psql -c "ALTER ROLE your_username SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE your_username SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE your_username SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE your_database TO your_username;"

# Load SQL file to create tables and data (replace 'your_sql_file.sql' with your actual SQL file)
echo "Loading SQL file to create tables and data..."
sudo -u postgres psql -d statistik -f install_postgres_and_create_db.sh

echo "PostgreSQL installation and database creation complete."
