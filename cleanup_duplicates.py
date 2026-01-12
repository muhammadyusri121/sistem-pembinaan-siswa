from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import SQLALCHEMY_DATABASE_URL

if not SQLALCHEMY_DATABASE_URL:
    # Fallback/Hardcode if env not loaded (adjust as needed for user env)
    SQLALCHEMY_DATABASE_URL = "postgresql://zeroo_database:***@localhost:5432/pembinaan_siswa"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def cleanup_duplicates():
    db = SessionLocal()
    try:
        print("Searching for duplicate students ending in .0...")
        
        # Select all students with NIS ending in .0
        query = text("SELECT nis FROM siswa WHERE nis LIKE '%.0'")
        results = db.execute(query).fetchall()
        
        duplicates = [row[0] for row in results]
        
        if not duplicates:
            print("No duplicate students with '.0' suffix found.")
            return

        print(f"Found {len(duplicates)} students with '.0' suffix.")
        
        count = 0
        for bad_nis in duplicates:
            clean_nis = bad_nis.replace('.0', '')
            
            # Check if the clean version exists
            check_query = text("SELECT nis FROM siswa WHERE nis = :nis")
            exists = db.execute(check_query, {"nis": clean_nis}).fetchone()
            
            if exists:
                print(f"Deleting duplicate {bad_nis} (original {clean_nis} exists)...")
                # Delete related records
                db.execute(text("DELETE FROM pelanggaran WHERE nis_siswa = :nis"), {"nis": bad_nis})
                db.execute(text("DELETE FROM prestasi WHERE nis_siswa = :nis"), {"nis": bad_nis})
                db.execute(text("DELETE FROM riwayat_kelas WHERE nis = :nis"), {"nis": bad_nis})
                db.execute(text("DELETE FROM perwalian WHERE nis_siswa = :nis"), {"nis": bad_nis})
                # Delete the student
                db.execute(text("DELETE FROM siswa WHERE nis = :nis"), {"nis": bad_nis})
                count += 1
            else:
                print(f"Renaming {bad_nis} to {clean_nis}...")
                
                # Careful rename steps:
                # 1. Create the new student record with clean NIS (copy from old)
                # 2. Update all FKs to point to new NIS
                # 3. Delete the old student record
                
                # 1. Create new student
                # We need to select all columns to copy properly, but for raw SQL simplification:
                # We update the primary key but we must handle children first.
                # Since 'UPDATE siswa SET nis...' fails if children exist and point to old, 
                # we need to defer constraints or do it in precise order?
                # Actually, standard update CASCADE handles this if configured. If not, we must manually update children.
                # THE ERROR "violates foreign key constraint... is not present in table siswa" came from updating child table FIRST before parent existed.
                
                # CORRECT ORDER:
                # 1. Create NEW parent with clean NIS
                # 2. Update children to point to NEW NIS
                # 3. Delete OLD parent
                
                # Step 1: Clone Metadata to new NIS
                # Because columns are many, let's just UPDATE the parent NIS.
                # BUT to update parent NIS, we must usually drop children FKs or have cascade.
                # If we update children first, they point to a non-existent parent => Error.
                # If we update parent first, children lose their parent => Error (if not deferrable).
                
                # Strategy: 
                # A. Create a placeholder NEW student with clean NIS.
                columns = db.execute(text("SELECT * FROM siswa WHERE nis = :nis"), {"nis": bad_nis}).fetchone()
                # Construct INSERT (a bit tedious with raw text but safe)
                # Let's try a simpler approach: 
                # Since we are in a transaction, we can create the row.
                
                # Since we don't know exact columns easily without reflection in this quick script, 
                # let's try to just UPDATE the student record carefully.
                # If we can't update because of children, we have a problem.
                # However, the error previously was: updating `riwayat_kelas`.
                
                # Let's try:
                # 1. Insert new student with clean NIS (copying from dirty)
                # 2. Update children to new NIS
                # 3. Delete old student
                
                # To copy dynamically:
                insp = db.execute(text(f"SELECT * FROM siswa WHERE nis = '{bad_nis}'")).mappings().fetchone()
                if insp:
                    # prepare insert dict
                    new_data = dict(insp)
                    new_data['nis'] = clean_nis
                    
                    # Columns list for insert
                    cols = ', '.join(new_data.keys())
                    vals = ', '.join([f":{k}" for k in new_data.keys()])
                    
                    insert_sql = text(f"INSERT INTO siswa ({cols}) VALUES ({vals})")
                    db.execute(insert_sql, new_data)
                    
                    # Now update children
                    db.execute(text("UPDATE pelanggaran SET nis_siswa = :new WHERE nis_siswa = :old"), {"new": clean_nis, "old": bad_nis})
                    db.execute(text("UPDATE prestasi SET nis_siswa = :new WHERE nis_siswa = :old"), {"new": clean_nis, "old": bad_nis})
                    db.execute(text("UPDATE riwayat_kelas SET nis = :new WHERE nis = :old"), {"new": clean_nis, "old": bad_nis})
                    db.execute(text("UPDATE perwalian SET nis_siswa = :new WHERE nis_siswa = :old"), {"new": clean_nis, "old": bad_nis})
                    
                    # Delete old
                    db.execute(text("DELETE FROM siswa WHERE nis = :old"), {"old": bad_nis})
                    count += 1

        db.commit()
        print(f"Successfully processed {count} records.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicates()
