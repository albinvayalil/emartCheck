using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Serilog; // ✅ Added Serilog

namespace ComplianceService.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class ComplianceCheckController : ControllerBase
    {
        private readonly ILogger<ComplianceCheckController> _logger;

        // ✅ Constructor to inject logger
        public ComplianceCheckController(ILogger<ComplianceCheckController> logger)
        {
            _logger = logger;
        }

        [HttpPost]
        public IActionResult Check([FromBody] UserRequest req)
        {
            try
            {
                Log.Information("Compliance check started for user: {UserId}", req.Id);

                var connString = "Host=postgres;Username=emartuser;Password=emartpass;Database=emartdb";

                using var conn = new NpgsqlConnection(connString);
                conn.Open();
                Log.Information("Connected to Postgres DB");

                using var cmd = new NpgsqlCommand(
                    "SELECT kyc_verified, balance FROM users WHERE id = @id", conn);
                cmd.Parameters.AddWithValue("id", req.Id);

                using var reader = cmd.ExecuteReader();

                if (!reader.Read())
                {
                    Log.Warning("User not found: {UserId}", req.Id);
                    return Unauthorized(new { status = "Rejected", reason = "User not found" });
                }

                bool kycVerified = reader.GetBoolean(0);
                decimal balance = reader.GetDecimal(1);

                if (!kycVerified)
                {
                    Log.Warning("KYC not verified for user: {UserId}", req.Id);
                    return BadRequest(new { status = "Rejected", reason = "KYC not verified" });
                }

                if (balance < req.CartTotal)
                {
                    Log.Warning("Insufficient balance for user: {UserId}. Available: {Balance}, Required: {Required}",
                        req.Id, balance, req.CartTotal);
                    return BadRequest(new
                    {
                        status = "Rejected",
                        reason = $"Insufficient balance. Available: ₹{balance}, Required: ₹{req.CartTotal}"
                    });
                }

                Log.Information("Compliance approved for user: {UserId}", req.Id);
                return Ok(new { status = "Approved" });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Error during compliance check for user: {UserId}", req.Id);
                return StatusCode(500, new { status = "Error", message = ex.Message });
            }
        }

        public class UserRequest
        {
            public string Id { get; set; }
            public decimal CartTotal { get; set; }  // 🆕 Added cart total
        }
    }
}
