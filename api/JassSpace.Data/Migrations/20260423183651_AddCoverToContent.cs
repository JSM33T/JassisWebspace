using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoverToContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cover",
                table: "Contents",
                type: "text",
                nullable: true);

            // Backfill Cover from source tables for existing rows
            migrationBuilder.Sql("""
                UPDATE "Contents" c
                SET "Cover" = b."FeaturedImage"
                FROM "Blogs" b
                WHERE c."ContentType" = 2
                  AND c."ContentRefId" = b."Id"
                  AND b."FeaturedImage" IS NOT NULL;

                UPDATE "Contents" c
                SET "Cover" = a."Cover"
                FROM "Albums" a
                WHERE c."ContentType" = 1
                  AND c."ContentRefId" = a."Id"
                  AND a."Cover" IS NOT NULL;

                UPDATE "Contents" c
                SET "Cover" = t."Cover"
                FROM "Tracks" t
                WHERE c."ContentType" = 4
                  AND c."ContentRefId" = t."Id"
                  AND t."Cover" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cover",
                table: "Contents");
        }
    }
}
