"""
Seed script — run once to create a default admin user and sample data.
Usage: python seed.py
"""
from database import SessionLocal, engine, Base
import models
from security import get_password_hash
from datetime import date, datetime, timedelta


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── Admin user ──────────────────────────────
        if not db.query(models.User).filter(models.User.username == "admin").first():
            admin = models.User(
                username="admin",
                email="admin@crm.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin@123"),
                role=models.UserRole.admin,
                is_active=True
            )
            db.add(admin)
            print("✅ Admin user created — username: admin | password: admin@123")
        else:
            print("ℹ️  Admin user already exists")

        # ── Sales Personnel ─────────────────────────
        sales_users = [
            ("sarah_j", "sarah@crm.com", "Sarah Johnson", "sarah@123"),
            ("mike_k", "mike@crm.com", "Mike Kumar", "mike@123"),
        ]
        created_sales = []
        for username, email, full_name, password in sales_users:
            existing = db.query(models.User).filter(models.User.username == username).first()
            if not existing:
                user = models.User(
                    username=username,
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash(password),
                    role=models.UserRole.sales_personnel,
                    is_active=True
                )
                db.add(user)
                db.flush()
                created_sales.append(user)
                print(f"✅ Sales user created — username: {username} | password: {password}")
            else:
                created_sales.append(existing)

        db.flush()

        # ── Sample Leads ─────────────────────────────

        db.commit()
        print("\n🎉 Seeding complete!")
        print("=" * 45)
        print("Login credentials:")
        print("  Admin     → admin / admin@123")
        print("  Sales 1   → sarah_j / sarah@123")
        print("  Sales 2   → mike_k / mike@123")
        print("=" * 45)

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()