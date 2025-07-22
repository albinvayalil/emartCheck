FROM openjdk:17-slim

WORKDIR /app

# Install curl to fetch dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# ✅ Create lib folder and download dependencies
RUN mkdir libs && \
    # Postgres JDBC driver
    curl -o libs/postgresql.jar https://jdbc.postgresql.org/download/postgresql-42.7.3.jar && \
    # JSON library
    curl -o libs/json.jar https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar && \
    # SLF4J API for logging
    curl -o libs/slf4j-api.jar https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.7/slf4j-api-2.0.7.jar && \
    # Logback Core
    curl -o libs/logback-core.jar https://repo1.maven.org/maven2/ch/qos/logback/logback-core/1.4.11/logback-core-1.4.11.jar && \
    # Logback Classic (SLF4J binding)
    curl -o libs/logback-classic.jar https://repo1.maven.org/maven2/ch/qos/logback/logback-classic/1.4.11/logback-classic-1.4.11.jar

# Copy Java source
COPY src /app/src

# Copy logback configuration (placed in src/main/resources/logback.xml)
COPY src/main/resources/logback.xml /app/

# ✅ Compile Java code with all dependencies
RUN javac -cp "libs/*" -d out src/LedgerService.java

# ✅ Run application with libs and compiled classes in classpath
CMD ["java", "-cp", "out:libs/*", "LedgerService"]
