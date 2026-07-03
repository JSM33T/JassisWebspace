using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDevelopmentWall : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DevelopmentNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Body = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    Version = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DevelopmentNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DevelopmentNotes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DevelopmentSuggestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    GitHubIssueNumber = table.Column<int>(type: "integer", nullable: true),
                    GitHubIssueUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DevelopmentSuggestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DevelopmentSuggestions_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DevelopmentSuggestions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentNotes_Category",
                table: "DevelopmentNotes",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentNotes_CreatedAt",
                table: "DevelopmentNotes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentNotes_CreatedByUserId",
                table: "DevelopmentNotes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentNotes_IsPublished",
                table: "DevelopmentNotes",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentNotes_PublishedAt",
                table: "DevelopmentNotes",
                column: "PublishedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentSuggestions_CreatedAt",
                table: "DevelopmentSuggestions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentSuggestions_ReviewedByUserId",
                table: "DevelopmentSuggestions",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentSuggestions_Status",
                table: "DevelopmentSuggestions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DevelopmentSuggestions_UserId",
                table: "DevelopmentSuggestions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DevelopmentNotes");

            migrationBuilder.DropTable(
                name: "DevelopmentSuggestions");
        }
    }
}
