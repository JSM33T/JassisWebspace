using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContentViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastViewedAt",
                table: "Contents",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "Contents",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ContentViews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ViewedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentViews_Contents_ContentId",
                        column: x => x.ContentId,
                        principalTable: "Contents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contents_LastViewedAt",
                table: "Contents",
                column: "LastViewedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ContentViews_ContentId_ViewedAt",
                table: "ContentViews",
                columns: new[] { "ContentId", "ViewedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentViews_ViewedAt",
                table: "ContentViews",
                column: "ViewedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentViews");

            migrationBuilder.DropIndex(
                name: "IX_Contents_LastViewedAt",
                table: "Contents");

            migrationBuilder.DropColumn(
                name: "LastViewedAt",
                table: "Contents");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "Contents");
        }
    }
}
