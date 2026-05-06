import sqlite3

def add_columns():
    conn = sqlite3.connect('segmentflow.db')
    cursor = conn.cursor()
    
    columns = [
        ("industry", "VARCHAR"),
        ("company_size", "VARCHAR"),
        ("business_structure", "VARCHAR"),
        ("location", "VARCHAR"),
        ("primary_objective", "VARCHAR")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE companies ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
