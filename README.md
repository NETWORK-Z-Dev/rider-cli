# rider-cli
 Rider is a custom-made distribution system made for code libraries like npm packages, frontend libraries, software in general and more using version folders.

To install rider-cli on your system you can use the following command:
```bash
curl -fsSL https://dist.dcts.community/api/package/rider-cli/install.sh | bash
```

------

## NodeJS / Bun Integration in 3 Steps!

### Step 1

If you want to use rider to install backend libraries you will need to use a post-install script that looks like this:

```js
// https://dist.dcts.community/api/package/rider-cli/postinstall.mjs
import { execSync } from "node:child_process";

try {
    execSync("rider gid", {
        stdio: "ignore"
    });
} catch {
    execSync("curl -fsSL https://dist.dcts.community/api/package/rider-cli/install.sh | bash", {
        stdio: "inherit",
        shell: true
    });
}

execSync("rider install", {
    stdio: "inherit"
});
```

### Step 2

In order for this script to be executed after the NodeJS / Bun install command, you will need to edit your `package.json` file to "register" the post-install file. In this example, we will assume its in the project's root folder.

```json
 "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "postinstall": "bun postinstall.mjs", // « you need to add this
  },
```

### Step 3

Only once now you will need to manually install the needed packages via rider with `rider install <package>`. On successful execution it will generate a `rider.json` file, similar to npm's `package.json` file. The `rider.json` file will keep a list of all (rider) packages. Once `rider install` is executed in the same working directory it will automatically install all these packages from the json file. Done!

---

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
