using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace JassSpace.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContentFuzzySearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Contents",
                type: "tsvector",
                nullable: false,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector")
                .Annotation("Npgsql:TsVectorConfig", "english")
                .Annotation("Npgsql:TsVectorProperties", new[] { "Title", "Description", "SearchBody" })
                .OldAnnotation("Npgsql:TsVectorConfig", "english")
                .OldAnnotation("Npgsql:TsVectorProperties", new[] { "Title", "SearchBody" });

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_Contents_Title_Trgm"
                    ON "Contents" USING GIN ("Title" gin_trgm_ops);

                CREATE INDEX IF NOT EXISTS "IX_Contents_Description_Trgm"
                    ON "Contents" USING GIN ("Description" gin_trgm_ops);

                CREATE INDEX IF NOT EXISTS "IX_Contents_Slug_Trgm"
                    ON "Contents" USING GIN ("Slug" gin_trgm_ops);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_Contents_Title_Trgm";
                DROP INDEX IF EXISTS "IX_Contents_Description_Trgm";
                DROP INDEX IF EXISTS "IX_Contents_Slug_Trgm";
                """);

            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Contents",
                type: "tsvector",
                nullable: false,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector")
                .Annotation("Npgsql:TsVectorConfig", "english")
                .Annotation("Npgsql:TsVectorProperties", new[] { "Title", "SearchBody" })
                .OldAnnotation("Npgsql:TsVectorConfig", "english")
                .OldAnnotation("Npgsql:TsVectorProperties", new[] { "Title", "Description", "SearchBody" });
        }
    }
}
