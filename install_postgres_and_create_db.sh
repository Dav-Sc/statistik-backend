#!/bin/bash

# Update the package list to ensure we have the latest information
sudo apt update

# Install PostgreSQL and its command-line tools
sudo apt install -y postgresql postgresql-contrib

# Start the PostgreSQL service
sudo service postgresql start

# Create a PostgreSQL user and a database
echo "Creating PostgreSQL user and database..."
sudo -u postgres psql -c "CREATE USER statistik WITH PASSWORD 'database';"
sudo -u postgres psql -c "CREATE DATABASE your_database OWNER statistik;"

# Grant necessary privileges to the user
sudo -u postgres psql -c "ALTER ROLE statistik SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE statistik SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE statistik SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE your_database TO statistik;"

# Load SQL file to create tables and data
echo "Loading SQL file to create tables and data..."
sudo -u postgres psql -d your_database -f database.sql

echo "PostgreSQL installation and database creation complete."
