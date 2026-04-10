import hashlib
import os
from typing import Optional
import aiofiles
from pypdf import PdfReader
from docx import Document as DocxDocument
import io

from app.core.config import settings


class DocumentParser:
    """
    Parse documents and extract text content.
    Supports PDF, DOCX, and TXT formats.
    """
    
    async def parse_file(self, file_path: str, filename: str) -> tuple[str, Optional[str]]:
        """
        Parse a file and extract text content.
        
        Returns: (text_content, error_message)
        """
        extension = filename.lower().split('.')[-1]
        
        try:
            if extension == 'pdf':
                return await self._parse_pdf(file_path), None
            elif extension in ['docx', 'doc']:
                return await self._parse_docx(file_path), None
            elif extension == 'txt':
                return await self._parse_txt(file_path), None
            else:
                return "", f"Unsupported file format: {extension}"
        except Exception as e:
            return "", f"Error parsing file: {str(e)}"
    
    async def _parse_pdf(self, file_path: str) -> str:
        """Extract text from PDF."""
        text_parts = []
        
        with open(file_path, 'rb') as f:
            pdf_reader = PdfReader(f)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        
        return "\n\n".join(text_parts)
    
    async def _parse_docx(self, file_path: str) -> str:
        """Extract text from DOCX."""
        doc = DocxDocument(file_path)
        
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        return "\n\n".join(text_parts)
    
    async def _parse_txt(self, file_path: str) -> str:
        """Extract text from TXT."""
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        return content


class FileHandler:
    """
    Secure file handling utilities.
    """
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent path traversal and other attacks."""
        # Remove path components
        filename = os.path.basename(filename)
        
        # Remove or replace dangerous characters
        filename = filename.replace('..', '')
        filename = ''.join(c for c in filename if c.isalnum() or c in '._- ')
        
        return filename
    
    @staticmethod
    def validate_extension(filename: str) -> bool:
        """Validate file extension against allowed list."""
        extension = filename.lower().split('.')[-1]
        return extension in settings.allowed_extensions_list
    
    @staticmethod
    def validate_file_size(file_size: int) -> bool:
        """Validate file size is within limits."""
        return file_size <= settings.max_file_size_bytes
    
    @staticmethod
    async def calculate_checksum(file_path: str) -> str:
        """Calculate SHA-256 checksum of file."""
        sha256_hash = hashlib.sha256()
        
        async with aiofiles.open(file_path, 'rb') as f:
            # Read in chunks to handle large files
            while True:
                chunk = await f.read(8192)
                if not chunk:
                    break
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    @staticmethod
    async def save_uploaded_file(file_content: bytes, filename: str) -> tuple[str, int]:
        """
        Save uploaded file to storage.
        
        Returns: (file_path, file_size)
        """
        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
        
        # Generate unique filename
        sanitized_name = FileHandler.sanitize_filename(filename)
        timestamp = int(os.times().elapsed * 1000000)  # microseconds
        unique_filename = f"{timestamp}_{sanitized_name}"
        file_path = os.path.join(settings.UPLOAD_DIRECTORY, unique_filename)
        
        # Write file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        return file_path, len(file_content)


document_parser = DocumentParser()
file_handler = FileHandler()
