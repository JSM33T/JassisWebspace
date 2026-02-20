using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System.Linq;

namespace JassSpace.Api.Controllers;

[Route("admin/users")]
[Authorize(Roles = "admin")]
public partial class AdminUserController(IUserRepository userRepository) : BaseApiController
{
    [System.Text.RegularExpressions.GeneratedRegex(@"^[a-zA-Z0-9_.-]+$")]
    private static partial System.Text.RegularExpressions.Regex RgxUsername();

    // ... (rest of class)

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IEnumerable<AdminUserListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var (users, total) = await userRepository.SearchAdminUsersAsync(search, page, pageSize, cancellationToken);
        
        Response.Headers.Append("X-Total-Count", total.ToString());
        
        return OkEnvelope(users);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<AdminUserDetailsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetAdminUserDetailsAsync(id, cancellationToken);

        if (user == null)
        {
            return NotFoundProblem("User not found");
        }

        return OkEnvelope(user);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ApiResponse<AdminUserDetailsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] AdminUpdateUserRequest request, CancellationToken cancellationToken)
    {
        if (request is null) return BadRequestProblem("Request body is required");
        
        var validationError = ValidateUpdateRequest(request);
        if (validationError is not null) return BadRequestProblem(validationError);

        var currentUserId = User.GetUserId();
        if (currentUserId == id)
        {
            if (request.IsActive == false)
            {
                return BadRequestProblem("You cannot deactivate your own account.");
            }
            if (request.Roles != null && !request.Roles.Any(r => r.Equals("admin", StringComparison.OrdinalIgnoreCase)))
            {
                // Simple check, though array might not contain "admin" if we are adding others? 
                // Wait, request.Roles IS the new set of roles.
                // If I am admin, and I update my roles to ["user"], I lose admin.
                return BadRequestProblem("You cannot remove the 'admin' role from yourself.");
            }
        }

        try 
        {
            var updatedUser = await userRepository.UpdateAdminUserAsync(id, request, cancellationToken);

            if (updatedUser == null)
            {
                return NotFoundProblem("User not found");
            }

            return OkEnvelope(updatedUser);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequestProblem(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(Guid id, CancellationToken cancellationToken)
    {
        if (User.GetUserId() == id)
        {
            return BadRequestProblem("You cannot delete your own account.");
        }

        var user = await userRepository.GetAdminUserDetailsAsync(id, cancellationToken);
        if (user == null)
        {
            return NotFoundProblem("User not found");
        }
        
        await userRepository.SoftDeleteUserAsync(id, cancellationToken);
        return NoContent();
    }
    private static string? ValidateUpdateRequest(AdminUpdateUserRequest request)
    {
        if (request.Email is not null)
        {
            var email = request.Email.Trim();
            if (email.Length == 0) return "Email cannot be empty";
            if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email)) return "Invalid email address";
        }

        if (request.Username is not null)
        {
            var username = request.Username.Trim();
            if (username.Length is < 3 or > 30) return "Username must be between 3 and 30 characters";
            if (!RgxUsername().IsMatch(username)) return "Username can only contain letters, numbers, underscores, dots, and hyphens";
        }

        if (!string.IsNullOrWhiteSpace(request.DisplayName) && request.DisplayName.Trim().Length > 50) return "Display name cannot exceed 50 characters";
        if (!string.IsNullOrWhiteSpace(request.Bio) && request.Bio.Trim().Length > 500) return "Bio cannot exceed 500 characters";

        if (request.Roles != null && request.Roles.Any(string.IsNullOrWhiteSpace)) return "Role names cannot be empty";

        return null;
    }
}
