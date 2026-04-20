using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContentSearchVector : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SearchBody",
                table: "Contents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Contents",
                type: "tsvector",
                nullable: false)
                .Annotation("Npgsql:TsVectorConfig", "english")
                .Annotation("Npgsql:TsVectorProperties", new[] { "Title", "SearchBody" });

            migrationBuilder.CreateIndex(
                name: "IX_Contents_SearchVector",
                table: "Contents",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Contents_SearchVector",
                table: "Contents");

            migrationBuilder.DropColumn(
                name: "SearchBody",
                table: "Contents");

            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Contents");
        }
    }
}
