using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class CentralizeContentAuthors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContentAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentAuthors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContentAuthors_Contents_ContentId",
                        column: x => x.ContentId,
                        principalTable: "Contents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContentAuthors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentAuthors_ContentId_Order",
                table: "ContentAuthors",
                columns: new[] { "ContentId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_ContentAuthors_ContentId_UserId",
                table: "ContentAuthors",
                columns: new[] { "ContentId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContentAuthors_UserId",
                table: "ContentAuthors",
                column: "UserId");

            migrationBuilder.Sql(@"
INSERT INTO ""ContentAuthors"" (""Id"", ""ContentId"", ""UserId"", ""Role"", ""Order"", ""CreatedAt"")
SELECT gen_random_uuid(), c.""Id"", ba.""UserId"", NULL, ba.""Order"", ba.""CreatedAt""
FROM ""BlogAuthors"" ba
JOIN ""Contents"" c ON c.""ContentRefId"" = ba.""BlogId"" AND c.""ContentType"" = 2;

INSERT INTO ""ContentAuthors"" (""Id"", ""ContentId"", ""UserId"", ""Role"", ""Order"", ""CreatedAt"")
SELECT gen_random_uuid(), c.""Id"", ga.""UserId"", NULL, ga.""Order"", ga.""CreatedAt""
FROM ""GalleryAuthors"" ga
JOIN ""Contents"" c ON c.""ContentRefId"" = ga.""AlbumId"" AND c.""ContentType"" = 1;

INSERT INTO ""ContentAuthors"" (""Id"", ""ContentId"", ""UserId"", ""Role"", ""Order"", ""CreatedAt"")
SELECT gen_random_uuid(), c.""Id"", ta.""UserId"", ta.""Role"", ta.""Order"", ta.""CreatedAt""
FROM ""TrackAuthors"" ta
JOIN ""Contents"" c ON c.""ContentRefId"" = ta.""TrackId"" AND c.""ContentType"" = 4;
");

            migrationBuilder.DropTable(name: "BlogAuthors");
            migrationBuilder.DropTable(name: "GalleryAuthors");
            migrationBuilder.DropTable(name: "TrackAuthors");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentAuthors");

            migrationBuilder.CreateTable(
                name: "BlogAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BlogId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogAuthors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BlogAuthors_Blogs_BlogId",
                        column: x => x.BlogId,
                        principalTable: "Blogs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BlogAuthors_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GalleryAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AlbumId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "TrackAuthors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Role = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true)
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

            migrationBuilder.CreateIndex(
                name: "IX_BlogAuthors_BlogId_Order",
                table: "BlogAuthors",
                columns: new[] { "BlogId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_BlogAuthors_BlogId_UserId",
                table: "BlogAuthors",
                columns: new[] { "BlogId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BlogAuthors_UserId",
                table: "BlogAuthors",
                column: "UserId");

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
        }
    }
}
