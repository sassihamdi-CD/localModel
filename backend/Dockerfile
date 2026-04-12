FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Strip Windows CRLF line endings from all shell scripts and make executable
RUN find . -name "*.sh" -exec sed -i 's/\r$//' {} \; && chmod +x entrypoint.sh

# Run the entrypoint script
CMD ["./entrypoint.sh"]
