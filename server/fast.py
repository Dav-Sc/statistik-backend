import pandas as pd

# Function to read data from either CSV or XLSX file
def read_data(file_path):
    if file_path.endswith('.xlsx'):
        return pd.read_excel(file_path)
    elif file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    else:
        raise ValueError("Unsupported file format. Please provide a .xlsx or .csv file.")

# Get the file path from the user
file_path = input("Enter the path to the file (either .xlsx or .csv): ")

try:
    # Read the data from the file into a Pandas DataFrame
    df = read_data(file_path)

    # Function to sort DataFrame based on user input
    def sort_dataframe(df, columns, ascending=True):
        try:
            sorted_df = df.sort_values(by=columns, ascending=ascending)
            return sorted_df
        except KeyError as e:
            print(f"Column '{e.args[0]}' not found in DataFrame. Please enter valid column names.")

    # Get user input for columns and sorting direction
    columns_to_sort = input("Enter column(s) to sort (comma-separated): ").split(',')
    ascending_order = input("Sort in ascending order (y/n): ").strip().lower() == 'y'

    # Remove leading/trailing whitespace from column names
    columns_to_sort = [col.strip() for col in columns_to_sort]

    # Sort the DataFrame based on user input
    sorted_df = sort_dataframe(df, columns_to_sort, ascending_order)

    # Display the sorted DataFrame
    print(sorted_df)

except FileNotFoundError:
    print(f"The file '{file_path}' was not found. Please check the file path.")
except ValueError as e:
    print(str(e))
except Exception as e:
    print(f"An error occurred: {str(e)}")
