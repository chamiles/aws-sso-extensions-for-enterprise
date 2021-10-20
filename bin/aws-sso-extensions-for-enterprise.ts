#!/usr/bin/env node

import { App, DefaultStackSynthesizer, Tags } from "@aws-cdk/core";
import * as fs from "fs";
import * as path from "path";
import { BuildConfig } from "../lib/build/buildConfig";
import { AwsSsoExtensionsForEnterprise } from "../lib/stacks/pipeline/aws-sso-extensions-for-enterprise";

const yaml = require("js-yaml");
const app = new App();

function ensureString(
  object: { [name: string]: any },
  propName: string
): string {
  if (!object[propName] || object[propName].trim().length === 0)
    throw new Error(propName + " does not exist or is empty");

  return object[propName];
}

function ensureValidString(
  object: { [name: string]: any },
  propName: string,
  validList: Array<string>
): string {
  if (
    !object[propName] ||
    object[propName].trim().length === 0 ||
    typeof object[propName] !== "string"
  )
    throw new Error(
      propName +
        " does not exist or is empty or is of not the correct data type"
    );

  const value = ("" + object[propName]).toUpperCase();
  if (!validList.includes(value)) {
    throw new Error(
      `${propName} is not one of the valid values - ${validList.toString()}`
    );
  }

  return object[propName];
}

function ensureBoolean(
  object: { [name: string]: any },
  propName: string
): boolean {
  if (typeof object[propName] !== "boolean")
    throw new Error(
      propName + " does not exist or is of not the correct data type"
    );

  return object[propName];
}

function getConfig() {
  let env = app.node.tryGetContext("config");
  if (!env)
    throw new Error(
      "Context variable missing on CDK command. Pass in as `-c config=XXX`"
    );

  let unparsedEnv = yaml.load(
    fs.readFileSync(path.resolve("./config/" + env + ".yaml"), "utf8")
  );

  return {
    App: ensureString(unparsedEnv, "App"),
    Environment: ensureString(unparsedEnv, "Environment"),
    Version: ensureString(unparsedEnv, "Version"),

    PipelineSettings: {
      BootstrapQualifier: ensureString(
        unparsedEnv["PipelineSettings"],
        "BootstrapQualifier"
      ),
      DeploymentAccountId: ensureString(
        unparsedEnv["PipelineSettings"],
        "DeploymentAccountId"
      ),
      DeploymentAccountRegion: ensureString(
        unparsedEnv["PipelineSettings"],
        "DeploymentAccountRegion"
      ),
      TargetAccountId: ensureString(
        unparsedEnv["PipelineSettings"],
        "TargetAccountId"
      ),
      TargetAccountRegion: ensureString(
        unparsedEnv["PipelineSettings"],
        "TargetAccountRegion"
      ),
      SSOServiceAccountId: ensureString(
        unparsedEnv["PipelineSettings"],
        "SSOServiceAccountId"
      ),
      SSOServiceAccountRegion: ensureString(
        unparsedEnv["PipelineSettings"],
        "SSOServiceAccountRegion"
      ),
      OrgMainAccountId: ensureString(
        unparsedEnv["PipelineSettings"],
        "OrgMainAccountId"
      ),
      RepoArn: ensureString(unparsedEnv["PipelineSettings"], "RepoArn"),
      RepoBranchName: ensureString(
        unparsedEnv["PipelineSettings"],
        "RepoBranchName"
      ),
      SynthCommand: ensureString(
        unparsedEnv["PipelineSettings"],
        "SynthCommand"
      ),
    },

    Parameters: {
      LinksProvisioningMode: ensureValidString(
        unparsedEnv["Parameters"],
        "LinksProvisioningMode",
        ["API", "S3"]
      ),
      PermissionSetProvisioningMode: ensureValidString(
        unparsedEnv["Parameters"],
        "PermissionSetProvisioningMode",
        ["API", "S3"]
      ),
      LinkCallerRoleArn: ensureString(
        unparsedEnv["Parameters"],
        "LinkCallerRoleArn"
      ),
      PermissionSetCallerRoleArn: ensureString(
        unparsedEnv["Parameters"],
        "PermissionSetCallerRoleArn"
      ),
      ApiCorsOrigin: ensureString(unparsedEnv["Parameters"], "ApiCorsOrigin"),
      NotificationEmail: ensureString(
        unparsedEnv["Parameters"],
        "NotificationEmail"
      ),
      IsAdUsed: ensureBoolean(unparsedEnv["Parameters"], "IsAdUsed"),
      DomainName: ensureString(unparsedEnv["Parameters"], "DomainName"),
    },
  };
}

async function DeploySSOForEnterprise() {
  let buildConfig: BuildConfig = getConfig();

  let AwsSsoExtensionsForEnterpriseAppName =
    buildConfig.Environment + "-" + buildConfig.App;
  const AwsSsoExtensionsForEnterpriseStack = new AwsSsoExtensionsForEnterprise(
    app,
    AwsSsoExtensionsForEnterpriseAppName,
    {
      env: {
        region: buildConfig.PipelineSettings.DeploymentAccountRegion,
        account: buildConfig.PipelineSettings.DeploymentAccountId,
      },
      synthesizer: new DefaultStackSynthesizer({
        qualifier: buildConfig.PipelineSettings.BootstrapQualifier,
      }),
    },
    buildConfig
  );

  Tags.of(AwsSsoExtensionsForEnterpriseStack).add("App", buildConfig.App);
  Tags.of(AwsSsoExtensionsForEnterpriseStack).add(
    "Environment",
    buildConfig.Environment
  );
}

DeploySSOForEnterprise();