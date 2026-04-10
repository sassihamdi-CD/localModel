"""
Seed script to populate initial roles and permissions.
Run after database migration.
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from app.core.config import settings
from app.models.models import Role, Permission, RolePermission


# Define all permissions
PERMISSIONS = [
    ("CHAT", "Use RAG chat interface"),
    ("VIEW_DOC", "View document details"),
    ("ADD_DOC", "Upload new documents"),
    ("EDIT_DOC", "Modify document metadata and ACL"),
    ("DELETE_DOC", "Delete documents"),
    ("VIEW_LOGS", "Access audit logs dashboard"),
    ("EXPORT_LOGS", "Export audit logs to CSV"),
    ("MANAGE_USERS", "Approve/deny access requests and manage users"),
    ("MANAGE_ROLES", "Create and modify roles"),
    ("MANAGE_PERMISSIONS", "Assign permissions to roles"),
]

# Define roles with their permissions
ROLES = {
    "ADMIN": {
        "description": "System administrator with full access",
        "permissions": [
            "CHAT", "VIEW_DOC", "ADD_DOC", "EDIT_DOC", "DELETE_DOC",
            "VIEW_LOGS", "EXPORT_LOGS", "MANAGE_USERS", "MANAGE_ROLES", "MANAGE_PERMISSIONS"
        ]
    },
    "SECURITY_OFFICER": {
        "description": "Security oversight and audit access",
        "permissions": ["VIEW_LOGS", "EXPORT_LOGS", "MANAGE_PERMISSIONS", "VIEW_DOC"]
    },
    "DOC_MANAGER": {
        "description": "Document management and access control",
        "permissions": ["CHAT", "VIEW_DOC", "ADD_DOC", "EDIT_DOC", "DELETE_DOC"]
    },
    "EMPLOYEE": {
        "description": "Regular user with chat and view access",
        "permissions": ["CHAT", "VIEW_DOC"]
    },
    "AUDITOR": {
        "description": "Compliance auditor with read-only access",
        "permissions": ["VIEW_LOGS", "EXPORT_LOGS", "VIEW_DOC"]
    },
}


async def seed_database():
    """Seed roles and permissions."""
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    # Create async session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        # Check if already seeded
        from sqlalchemy import select
        result = await session.execute(select(Permission))
        if result.first():
            print("⚠️  Database already seeded. Skipping...")
            return
        
        print("🌱 Seeding database with roles and permissions...")
        
        # Create permissions
        permission_map = {}
        for perm_name, perm_desc in PERMISSIONS:
            permission = Permission(
                name=perm_name,
                description=perm_desc,
                created_at=datetime.utcnow(),
            )
            session.add(permission)
            permission_map[perm_name] = permission
        
        await session.flush()
        
        # Create roles with permissions
        for role_name, role_data in ROLES.items():
            role = Role(
                name=role_name,
                description=role_data["description"],
                created_at=datetime.utcnow(),
            )
            session.add(role)
            await session.flush()
            
            # Assign permissions to role
            for perm_name in role_data["permissions"]:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission_map[perm_name].id,
                    assigned_at=datetime.utcnow(),
                )
                session.add(role_permission)
        
        await session.commit()
        
        print("✅ Database seeded successfully!")
        print(f"   Created {len(PERMISSIONS)} permissions")
        print(f"   Created {len(ROLES)} roles:")
        for role_name in ROLES.keys():
            print(f"     - {role_name}")


if __name__ == "__main__":
    asyncio.run(seed_database())
