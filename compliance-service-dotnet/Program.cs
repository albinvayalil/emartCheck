using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console() // ✅ Logs to console (for Docker)
    .WriteTo.File("Logs/compliance.log", rollingInterval: RollingInterval.Day) // ✅ File logs
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// ✅ Replace default logger with Serilog
builder.Host.UseSerilog();

builder.Services.AddControllers();

var app = builder.Build();

app.MapControllers();

app.Run();
