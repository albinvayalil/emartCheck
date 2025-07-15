FROM openjdk:17-slim

WORKDIR /app

# Install curl to fetch dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create lib folder and download dependencies
RUN mkdir libs && \
    curl -o libs/postgresql.jar https://jdbc.postgresql.org/download/postgresql-42.7.3.jar && \
    curl -o libs/json.jar https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar

# Copy Java source
COPY src /app/src

# Compile
RUN javac -cp "libs/*" -d out src/LedgerService.java

# Run
CMD ["java", "-cp", "out:libs/*", "LedgerService"]
