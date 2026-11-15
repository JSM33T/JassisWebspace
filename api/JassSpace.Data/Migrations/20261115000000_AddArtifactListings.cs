using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JassSpace.Data.Migrations;

[DbContext(typeof(JassSpaceDbContext))]
[Migration("20261115000000_AddArtifactListings")]
public sealed class AddArtifactListings : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("Category", "Artifacts", type: "character varying(80)", maxLength: 80, nullable: true);
        migrationBuilder.AddColumn<string>("ListingBody", "Artifacts", type: "text", nullable: true);
        migrationBuilder.AddColumn<string[]>("Tags", "Artifacts", type: "text[]", nullable: false, defaultValueSql: "ARRAY[]::text[]");
        migrationBuilder.Sql("""ALTER TABLE "Artifacts" ALTER COLUMN "Tags" DROP DEFAULT""");
        migrationBuilder.CreateTable(
            name: "ArtifactCovers",
            columns: table => new
            {
                ArtifactId = table.Column<Guid>(type: "uuid", nullable: false),
                Image = table.Column<byte[]>(type: "bytea", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ArtifactCovers", x => x.ArtifactId);
                table.ForeignKey("FK_ArtifactCovers_Artifacts_ArtifactId", x => x.ArtifactId, "Artifacts", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.Sql("""UPDATE "Contents" SET "Description" = NULL WHERE "ContentType" = 5 AND "Description" = 'Private shared artifact'""");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("ArtifactCovers");
        migrationBuilder.DropColumn("Category", "Artifacts");
        migrationBuilder.DropColumn("ListingBody", "Artifacts");
        migrationBuilder.DropColumn("Tags", "Artifacts");
    }
}
