using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTracks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tracks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: false),
                    Slug = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Duration = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    ReleaseDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Genre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Tags = table.Column<string[]>(type: "text[]", nullable: false),
                    Cover = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    Featured = table.Column<bool>(type: "boolean", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BootlegAssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tracks_BootlegAssets_BootlegAssetId",
                        column: x => x.BootlegAssetId,
                        principalTable: "BootlegAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "TrackAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackAuthors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrackAuthors_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrackAuthors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TrackLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    Label = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrackLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrackLinks_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "Tracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrackAuthors_TrackId_Order",
                table: "TrackAuthors",
                columns: new[] { "TrackId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_TrackAuthors_TrackId_UserId",
                table: "TrackAuthors",
                columns: new[] { "TrackId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TrackAuthors_UserId",
                table: "TrackAuthors",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrackLinks_TrackId_Order",
                table: "TrackLinks",
                columns: new[] { "TrackId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_BootlegAssetId",
                table: "Tracks",
                column: "BootlegAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_Category",
                table: "Tracks",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_CreatedAt",
                table: "Tracks",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_IsPublished",
                table: "Tracks",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_ReleaseDate",
                table: "Tracks",
                column: "ReleaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_Tracks_Slug",
                table: "Tracks",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TrackAuthors");

            migrationBuilder.DropTable(
                name: "TrackLinks");

            migrationBuilder.DropTable(
                name: "Tracks");
        }
    }
}
