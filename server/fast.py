import os
import zipfile
import pandas as pd
import json

# Define the folder where the zip files are located
folder_path = "public/files"

# Define a function to process a CSV file and add rows with non-zero values in the 2nd and 3rd columns to an array
def process_csv(zip_file_path, csv_filename):
    data_array = []

    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        with zip_ref.open(csv_filename) as csv_file:
            # Read the CSV file using Pandas
            df = pd.read_csv(csv_file)

            # Filter rows where the 2nd and 3rd columns are not equal to zero
            non_zero_rows = df[(df.iloc[:, 1] != 0) | (df.iloc[:, 2] != 0)]
            
            # Convert the filtered DataFrame to a list of dictionaries
            data_array = non_zero_rows.to_dict(orient='records')

    return data_array

# Create a dictionary to store the data arrays
data_dict = {}

# Look for all files in the folder
for filename in os.listdir(folder_path):
    if filename.endswith(("_creation.zip", "_earning.zip", "_interaction.zip", "_viewer.zip")):
        # Construct the full path to the zip file
        zip_file_path = os.path.join(folder_path, filename)

        try:
            if "_creation.zip" in filename:
                csv_filename = "LIVE_creation.csv"
                key = "LIVE_creation"
            elif "_earning.zip" in filename:
                csv_filename = "LIVE_earning.csv"
                key = "LIVE_earning"
            elif "_interaction.zip" in filename:
                csv_filename = "LIVE_interaction.csv"
                key = "LIVE_interaction"
            elif "_viewer.zip" in filename:
                csv_filename = "LIVE_viewer.csv"
                key = "LIVE_viewer"

            data = process_csv(zip_file_path, csv_filename)

            # Add the data array to the dictionary
            data_dict[key] = data

        except Exception as e:
            print(f"Error processing {csv_filename}: {e}")

# Save the data dictionary as a JSON file
output_json_file = "extracted_data.json"
with open(output_json_file, 'w') as json_file:
    json.dump(data_dict, json_file, indent=4)

print(f"Data saved to {output_json_file}")
