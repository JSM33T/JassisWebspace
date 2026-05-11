using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserEmailPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserEmailPreferences",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiveBroadcastEmails = table.Column<bool>(type: "boolean", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserEmailPreferences", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserEmailPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserEmailPreferences");
        }
    }
}
