# Code Signing Policy

This policy describes how Windows release artifacts of this repository are
code-signed.

## What gets signed

- The Windows installer produced by this repository's release workflow
  (`QianSuan Setup`, NSIS).

## Who signs

- Release artifacts are signed via [SignPath](https://signpath.io) using the
  certificate and signing policy provided by the **SignPath Foundation** for
  this open-source project.

## When signing happens

- Only the project maintainers can trigger a release build (protected `main`
  branch and version tags).
- Every public release artifact is submitted for signing as the final step of
  the release workflow before publication to GitHub Releases.

## What is never signed

- Nightly or debug builds
- Pull-request builds
- Any artifact not produced by the release workflow from a tagged commit

## Verification

Users can verify signatures with:

```powershell
signtool verify /pa /all <installer>.exe
```

The signing certificate carries the identity of the SignPath Foundation and is
timestamped (RFC 3161), so signatures remain valid after certificate expiry.
