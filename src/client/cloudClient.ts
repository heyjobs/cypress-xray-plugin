import axios, { AxiosResponse, isAxiosError } from "axios";
import FormData from "form-data";
import fs from "fs";
import { HTTPHeader, JWTCredentials } from "../credentials";
import { error, info, log, success } from "../logging/logging";
import {
    CloudImportCucumberTestsResponse,
    ExportCucumberTestsResponse,
    ImportCucumberTestsResponse,
    ImportIssueResponse,
} from "../types/xray/responses";
import { XrayExecutionResults } from "../types/xray/xray";
import { Client } from "./client";

export class CloudClient extends Client<JWTCredentials> {
    /**
     * The URL of Xray's Cloud API.
     * Note: API v1 would also work, but let's stick to the more recent one.
     */
    private static readonly URL = "https://xray.cloud.getxray.app/api/v2";

    protected async doImportExecutionResults(
        executionResults: XrayExecutionResults
    ): Promise<ImportIssueResponse> {
        return this.credentials
            .getAuthenticationHeader({
                authenticationURL: `${CloudClient.URL}/authenticate`,
            })
            .then(async (header: HTTPHeader) => {
                log("Uploading test results...");
                const progressInterval = setInterval(() => {
                    info("Still uploading...");
                }, 5000);
                try {
                    const response = await axios.post<
                        XrayExecutionResults,
                        AxiosResponse<ImportIssueResponse>
                    >(`${CloudClient.URL}/import/execution`, executionResults, {
                        headers: {
                            ...header,
                        },
                    });
                    success(
                        "Successfully uploaded test execution results:",
                        JSON.stringify(response.data)
                    );
                    return response.data;
                } catch (e: unknown) {
                    let errorFileName = "importExecutionResultsError.log";
                    if (isAxiosError(e)) {
                        errorFileName = "importExecutionResultsError.json";
                        fs.writeFileSync(
                            errorFileName,
                            JSON.stringify({
                                error: e.toJSON(),
                                response: e.response.data,
                            })
                        );
                    } else {
                        fs.writeFileSync(errorFileName, JSON.stringify(e));
                    }
                    error(
                        `Upload failed. Complete error logs have been written to "${errorFileName}".`
                    );
                    throw new Error(
                        `Failed to upload results to Xray: "${e}".`
                    );
                } finally {
                    clearInterval(progressInterval);
                }
            });
    }

    protected async doExportCucumberTests(
        keys?: string,
        filter?: number
    ): Promise<ExportCucumberTestsResponse> {
        const header = await this.credentials.getAuthenticationHeader({
            authenticationURL: `${CloudClient.URL}/authenticate`,
        });
        log("Exporting cucumber tests...");
        const progressInterval = setInterval(() => {
            info("Still exporting...");
        }, 5000);
        try {
            const response = await axios.get(
                `${CloudClient.URL}/export/cucumber`,
                {
                    headers: {
                        ...header,
                    },
                    params: {
                        keys: keys,
                        filter: filter,
                    },
                }
            );
            // Extract filename from response.
            const contentDisposition = response.headers["Content-Disposition"];
            const filenameStart = contentDisposition.indexOf('"');
            const filenameEnd = contentDisposition.lastIndexOf('"');
            const filename = contentDisposition.substring(
                filenameStart,
                filenameEnd
            );
            fs.writeFile(
                filename,
                response.data,
                (error: NodeJS.ErrnoException | null) => {
                    throw new Error(
                        `Failed to export cucumber feature files: "${error}"`
                    );
                }
            );
            throw new Error("Method not implemented.");
        } catch (error: unknown) {
            throw new Error("Method not implemented.");
        } finally {
            clearInterval(progressInterval);
        }
    }

    protected async doImportCucumberTests(
        file: string,
        projectKey?: string,
        projectId?: string,
        source?: string
    ): Promise<ImportCucumberTestsResponse> {
        const header = await this.credentials.getAuthenticationHeader({
            authenticationURL: `${CloudClient.URL}/authenticate`,
        });
        log("Importing cucumber feature files...");
        const progressInterval = setInterval(() => {
            info("Still importing...");
        }, 5000);
        try {
            const fileContent = fs.createReadStream(file);
            const form = new FormData();
            form.append("file", fileContent);

            const response = await axios.post<
                FormData,
                AxiosResponse<CloudImportCucumberTestsResponse>
            >(`${CloudClient.URL}/import/feature`, form, {
                headers: {
                    ...header,
                    ...form.getHeaders(),
                },
                params: {
                    projectKey: projectKey,
                    projectId: projectId,
                    source: source,
                },
            });
            if (response.data.updatedOrCreatedTests.length > 0) {
                log(
                    "Successfully updated or created test issues:",
                    JSON.stringify(response.data.updatedOrCreatedTests)
                );
            }
            if (response.data.updatedOrCreatedPreconditions.length > 0) {
                log(
                    "Successfully updated or created precondition issues:",
                    JSON.stringify(response.data.updatedOrCreatedPreconditions)
                );
            }
            if (response.data.errors.length > 0) {
                error(
                    "Encountered some errors during import:",
                    JSON.stringify(response.data.errors)
                );
            }
            return response.data;
        } catch (e: unknown) {
            let errorFileName = "importCucumberTestsError.log";
            if (isAxiosError(e)) {
                errorFileName = "importCucumberTestsError.json";
                fs.writeFileSync(
                    errorFileName,
                    JSON.stringify({
                        error: e.toJSON(),
                        response: e.response.data,
                    })
                );
            } else {
                fs.writeFileSync(errorFileName, JSON.stringify(e));
            }
            error(
                `Failed to import cucumber feature files into Xray. Complete error logs have been written to "${errorFileName}".`
            );
            throw new Error(
                `Failed to import cucumber feature files into Xray: "${e}"`
            );
        } finally {
            clearInterval(progressInterval);
        }
    }
}
