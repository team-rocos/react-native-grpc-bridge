module.exports = {
  pkgRoot: './',
  branches: 'main',
  npmPublish: false,
  ci: false,
  plugins: [
    '@semantic-release/npm',
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'angular',
        releaseRules: [
          { type: 'docs', scope: 'README', release: 'patch' },
          { type: 'fix', release: 'patch' },
          { type: 'refactor', release: 'patch' },
          { type: 'chore', release: 'patch' },
          { type: 'feat', release: 'minor' },
          { scope: 'no-release', release: false },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'angular',
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
        writerOpts: {
          commitsSort: ['subject', 'scope'],
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          'npx replace-json-property package.json version ${nextRelease.version}',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message:
          'chore(release): ${nextRelease.version} \n\n[skip ci]\n${nextRelease.notes}',
      },
    ],
    "@semantic-release/github",
    [
      'semantic-release-slack-bot',
      {
        notifyOnSuccess: true,
        notifyOnFail: false,
        slackWebhook:
          'https://hooks.slack.com/services/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',
        onSuccessTemplate: {
          text: 'Version $npm_package_version of @rocos/react-native-grpc-bridge is being released, sit tight :rocket: \nThis version includes: \n $release_notes',
        },
      },
    ],
  ],
};
