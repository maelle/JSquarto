/**
 *  This TypeScript module (Writer) contains classes and functions
 *  for generating documentation structure and content.
 *  It interacts with various files and directories to organize
 *  documentation chapters, write content to Markdown files,
 *  and generate Quarto YAML configuration for the documentation book.
 *
 *  **Note**: This module is not yet complete and is still under development.
 *  */

import { Doc, ModuleBlockInfo } from "../interfaces";
import fs from "fs";
import { Category, ModuleDoc } from "./components";
import logger from "./logger";
import path from "path";
import YAML from "yaml";
import { DEFAULT_QUARTO_YAML_CONTENT, INDEX_QMD_CONTENT } from "../constants";

interface Chapter {
    part: string;
    chapters: string[] | undefined;
}

export default class Writer {
    private generateQuartoYAML(chapters: Chapter[]): void {
        try {
            // Check if there is a index.md file in the root of the docs folder
            // If not, create one
            const rootDocsPath = __dirname + "/../../docs";
            const indexFilePath = rootDocsPath + "/index.md";
            if (!fs.existsSync(indexFilePath)) {
                fs.writeFileSync(indexFilePath, INDEX_QMD_CONTENT, "utf8");
            }

            const quartoYAML = {
                ...DEFAULT_QUARTO_YAML_CONTENT,
                book: {
                    ...DEFAULT_QUARTO_YAML_CONTENT.book,
                    chapters: ["index.md", ...chapters],
                },
            };

            if (chapters.length === 0) {
                logger.warn("No chapters found for Quarto YAML");
            }

            const folderPathToWrite = path.join(__dirname, "..", "..", "docs");
            const quartoYAMLPath = path.join(folderPathToWrite, "_quarto.yml");

            fs.writeFileSync(
                quartoYAMLPath,
                YAML.stringify(quartoYAML),
                "utf8",
            );
            logger.info(`Quarto YAML file generated: ${quartoYAMLPath}`);
        } catch (error) {
            logger.error("Error generating Quarto YAML file");
            logger.error(error);
            throw error;
        }
    }

    // Create directory structure for documentation
    public prepareDirectoryForDocs(categories: Category[]) {
        const folderPathToWrite = path.join(
            __dirname,
            "..",
            "..",
            "docs",
            "chapters",
        );

        try {
            fs.mkdirSync(folderPathToWrite, { recursive: true });
            logger.info(`Documentation folder created: ${folderPathToWrite}`);

            const chapters: Chapter[] = [];

            for (const category of categories) {
                const categoryFolderPath = path.join(
                    folderPathToWrite,
                    category.name,
                );
                fs.mkdirSync(categoryFolderPath, { recursive: true });
                // Add index.qmd file to category folder
                fs.writeFileSync(
                    path.join(categoryFolderPath, "index.qmd"),
                    `---\ntitle: ${category.name}\n---\n`,
                    "utf8",
                );

                logger.info(`Category folder created: ${categoryFolderPath}`);

                for (const subCategory of category.subCategories) {
                    const subCategoryFolderPath = path.join(
                        categoryFolderPath,
                        subCategory.name,
                    );
                    fs.mkdirSync(subCategoryFolderPath, {
                        recursive: true,
                    });

                    // Add index.qmd file to subcategory folder
                    fs.writeFileSync(
                        path.join(subCategoryFolderPath, "index.qmd"),
                        `---\ntitle: ${subCategory.name}\n---\n`,
                        "utf8",
                    );
                    logger.info(
                        `Sub-category folder created: ${subCategoryFolderPath}`,
                    );

                    // Collect subchapters for Quarto YAML
                    const subchapters = subCategory
                        .getModules()
                        .map(
                            (module) =>
                                `chapters/${category.name}/${subCategory.name}/${module.info.name}.qmd`,
                        );

                    // Group subchapters under subcategory
                    chapters.push({
                        part: subCategory.name,
                        chapters:
                            subchapters.length > 0 ? subchapters : undefined,
                    });
                }

                // Collect chapters for Quarto YAML
                const categoryChapters = category.subCategories.map(
                    (subCategory) =>
                        `chapters/${category.name}/${subCategory.name}/index.qmd`,
                );

                // Group chapters under category
                chapters.push({
                    part: category.name,
                    chapters: categoryChapters,
                });
            }

            // Generate Quarto YAML
            this.generateQuartoYAML(chapters.flat());
            return this;
        } catch (error) {
            logger.error("Error preparing directory for docs");
            logger.error(error);
            throw error;
        }
    }

    // Write documentation to file
    private writeDocsToFile({
        module,
        destinationPath,
        docs,
    }: {
        module: ModuleBlockInfo;
        destinationPath: string;
        docs: ModuleDoc[];
    }) {
        // Get file path
        const qmdfilePath = destinationPath + "/" + module.name + ".qmd";

        try {
            fs.writeFileSync(qmdfilePath, "", "utf8");

            let fileContent = "";

            //  Add module title to qmd file
            fileContent += `--- \n title: ${module.name} \n---\n`;

            // Add module description to qmd file
            fileContent += `## Description \n ${module.description} \n`;

            // Add constructs to qmd file
            for (const _doc of docs) {
                const doc = {
                    blockInfo: _doc.data,
                    constructInfo: {
                        type: "Function",
                        name: module.name,
                    },
                };

                // Add 2 lines
                fileContent += "\n\n";

                fileContent += `## ${doc.constructInfo.type} ${doc.constructInfo.name} \n`;

                // Add description to qmd file
                fileContent += `### Description \n ${doc.blockInfo.description} \n`;

                // Add params to qmd file
                if (doc.blockInfo.params.length > 0) {
                    fileContent += `### Params \n`;
                    for (const param of doc.blockInfo.params) {
                        fileContent += `**${param.name}**: ${param.description} \n`;
                    }
                }

                // Add returns to qmd file
                if (doc.blockInfo.returns.length > 0) {
                    fileContent += `### Returns \n`;
                    for (const returnedValue of doc.blockInfo.returns) {
                        fileContent += `**${returnedValue.type}**: ${returnedValue.description} \n`;
                    }
                }

                // Add thrown errors to qmd file
                if (doc.blockInfo.thrownErrors.length > 0) {
                    fileContent += `### Thrown Errors \n`;
                    for (const thrownError of doc.blockInfo.thrownErrors) {
                        fileContent += `**${thrownError.type}**: ${thrownError.description} \n`;
                    }
                }

                // Add link to qmd file
                if (doc.blockInfo.link) {
                    fileContent += `### Link \n ${doc.blockInfo.link} \n`;
                }
            }

            fs.writeFileSync(qmdfilePath, fileContent, "utf8");
            logger.info(`Documentation written to file: ${qmdfilePath}`);
        } catch (error) {
            logger.error(`Error writing documentation to file: ${qmdfilePath}`);
            logger.error(error);
            throw error;
        }
    }

    // Write documentation for each category to file
    public writeDocsFromCategoriesToFile(categories: Category[]) {
        for (const category of categories) {
            const categoryFolderPath =
                __dirname + `/../../docs/chapters/${category.name}`;

            for (const subCategory of category.subCategories) {
                const subCategoryFolderPath =
                    categoryFolderPath + "/" + subCategory.name;

                for (const module of subCategory.getModules()) {
                    this.writeDocsToFile({
                        module: module.info,
                        destinationPath: subCategoryFolderPath,
                        docs: module.getDocs(),
                    });
                }
            }
        }

        return this;
    }
}
