using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TravelWise.API.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string resetToken)
    {
        var smtpHost = _configuration["Smtp:Host"] ?? Environment.GetEnvironmentVariable("SMTP_HOST");
        var smtpPortStr = _configuration["Smtp:Port"] ?? Environment.GetEnvironmentVariable("SMTP_PORT");
        var smtpUser = _configuration["Smtp:Username"] ?? Environment.GetEnvironmentVariable("SMTP_USERNAME");
        var smtpPass = _configuration["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");
        var fromEmail = _configuration["Smtp:FromEmail"] ?? Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? "no-reply@travelwise.lk";
        var clientBaseUrl = _configuration["App:ClientUrl"] ?? Environment.GetEnvironmentVariable("CLIENT_URL") ?? "http://localhost:5173";

        var resetUrl = $"{clientBaseUrl}/reset-password?email={Uri.EscapeDataString(toEmail)}&token={Uri.EscapeDataString(resetToken)}";

        // If SMTP is not configured, safely log to console in development mode
        if (string.IsNullOrWhiteSpace(smtpHost))
        {
            _logger.LogInformation(
                "[DEV EMAIL SERVICE] SMTP not configured. Password reset link for {Email}: {ResetUrl} (Token: {Token})",
                toEmail,
                resetUrl,
                resetToken
            );
            return true;
        }

        try
        {
            int port = int.TryParse(smtpPortStr, out var p) ? p : 587;
            using var client = new SmtpClient(smtpHost, port)
            {
                EnableSsl = port == 465 || port == 587,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            var mail = new MailMessage
            {
                From = new MailAddress(fromEmail, "TravelWise Platform"),
                Subject = "TravelWise - Password Reset Instructions",
                Body = $@"
                    <html>
                    <body style='font-family: Arial, sans-serif; color: #0F2B48; line-height: 1.6;'>
                        <div style='max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px;'>
                            <h2 style='color: #0F2B48; margin-top: 0;'>TravelWise Password Reset</h2>
                            <p>Hello,</p>
                            <p>We received a request to reset your TravelWise password. Click the button below to choose a new password:</p>
                            <div style='text-align: center; margin: 28px 0;'>
                                <a href='{resetUrl}' style='background-color: #0F2B48; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Reset Password</a>
                            </div>
                            <p style='font-size: 0.88rem; color: #64748B;'>This link is valid for 1 hour and can only be used once.</p>
                            <p style='font-size: 0.88rem; color: #64748B;'>If you did not request this, please disregard this email.</p>
                        </div>
                    </body>
                    </html>",
                IsBodyHtml = true
            };
            mail.To.Add(toEmail);

            await client.SendMailAsync(mail);
            _logger.LogInformation("Password reset email sent successfully to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deliver password reset email to {Email}", toEmail);
            return false;
        }
    }
}
