"""
Create the first admin user.
This script should be run AFTER seed_roles.py.
"""
import asyncio
import sys
import os
import getpass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.models import User, Role, UserRole, UserStatus
from datetime import datetime


async def create_admin():
    """Create the first admin user."""
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    # Create async session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).join(UserRole, User.id == UserRole.user_id).join(Role).where(Role.name == "ADMIN")
        )
        
        admin_user = result.scalar_one_or_none()
        if admin_user:
            print("⚠️  Admin user already exists. Updating password...")
            admin_user.password_hash = hash_password("Password123!")
            await session.commit()
            print("✅ Admin password updated successfully!")
            return
        
        print("🔐 Creating first admin user...\n")
        
        # Get admin details
        # Bypass prompts for automated fix
        email = "admin@test.com"
        name = "Test Admin"
        department = "IT"
        password = "Password123!"
        
        # Hash password
        password_hash = hash_password(password)
        
        # Create user
        user = User(
            email=email,
            name=name,
            department=department or None,
            password_hash=password_hash,
            status=UserStatus.ACTIVE,
            is_active=True,
            created_at=datetime.utcnow(),
        )
        
        session.add(user)
        await session.flush()
        
        # Get ADMIN role
        role_result = await session.execute(
            select(Role).where(Role.name == "ADMIN")
        )
        admin_role = role_result.scalar_one()
        
        # Assign ADMIN role
        user_role = UserRole(
            user_id=user.id,
            role_id=admin_role.id,
            assigned_at=datetime.utcnow(),
        )
        
        session.add(user_role)
        await session.commit()
        
        print("\n✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: ADMIN")
        print("\n🎉 You can now login to the application!")


if __name__ == "__main__":
    asyncio.run(create_admin())
