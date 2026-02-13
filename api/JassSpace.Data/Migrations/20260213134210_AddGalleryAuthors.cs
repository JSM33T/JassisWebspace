using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGalleryAuthors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GalleryAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AlbumId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GalleryAuthors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GalleryAuthors_Albums_AlbumId",
                        column: x => x.AlbumId,
                        principalTable: "Albums",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GalleryAuthors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GalleryAuthors_AlbumId_Order",
                table: "GalleryAuthors",
                columns: new[] { "AlbumId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_GalleryAuthors_AlbumId_UserId",
                table: "GalleryAuthors",
                columns: new[] { "AlbumId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GalleryAuthors_UserId",
                table: "GalleryAuthors",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GalleryAuthors");
        }
    }
}
