# rider-cli
 Rider is a custom-made distribution system made for code libraries like npm packages, frontend libraries, software in general and more using version folders.

To install rider-cli on your system you can use the following command:
```bash
curl -fsSL https://dist.dcts.community/api/package/rider-cli/install.sh | bash
```

------

## Commands

### rider init

This will help you create a new rider project.

### rider bump

When you've created a project, this will bump the version number

### rider publish

This will upload your package to the distribution host.

### rider key

Will print your public key used for authentification

### rider gid

Used to print your public key's fingerprint

### rider install <package>

supports package formats like `packageName@version`, `packageName`, `@user/packageName` and `@user/PackageName@version`. If a `rider.json` file exists in the working directory, rider will automatically install all packages listed in that file with the given version.
