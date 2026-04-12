"""
Seed script to create demo test accounts for development/demo purposes.
Creates one user per role so the system can be tested immediately after install.
Skips creation if accounts already exist — safe to run multiple times.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from datetime import datetime

from app.core.config import settings
from app.core.security import hash_password
from app.models.models import User, Role, UserRole, UserStatus


TEST_USERS = [
    {
        "email": "employee@test.com",
        "name": "Alice Employee",
        "department": "Operations",
        "password": "Employee123!",
        "role": "EMPLOYEE",
    },
    {
        "email": "docmgr@test.com",
        "name": "Carol DocMgr",
        "department": "IT",
        "password": "DocMgr123!",
        "role": "DOC_MANAGER",
    },
    {
        "email": "security@test.com",
        "name": "Bob Security",
        "department": "Security",
        "password": "Security123!",
        "role": "SECURITY_OFFICER",
    },
]


async def seed_test_users():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        created = 0
        for u in TEST_USERS:
            # Skip if already exists
            result = await session.execute(select(User).where(User.email == u["email"]))
            if result.scalar_one_or_none():
                continue

            # Get role
            role_result = await session.execute(select(Role).where(Role.name == u["role"]))
            role = role_result.scalar_one_or_none()
            if not role:
                print(f"  ⚠️  Role {u['role']} not found — skipping {u['email']}")
                continue

            user = User(
                email=u["email"],
                name=u["name"],
                department=u["department"],
                password_hash=hash_password(u["password"]),
                status=UserStatus.ACTIVE,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            session.add(user)
            await session.flush()

            session.add(UserRole(
                user_id=user.id,
                role_id=role.id,
                assigned_at=datetime.utcnow(),
            ))
            created += 1
            print(f"  ✅ Created {u['role']}: {u['email']} / {u['password']}")

        await session.commit()
        if created == 0:
            print("  ℹ️  Test users already exist. Skipping.")
        else:
            print(f"  ✅ Created {created} test user(s).")


if __name__ == "__main__":
    asyncio.run(seed_test_users())
