import { snakeGraphUrls, pacmanGraphUrls } from './readme';
import type { GraphPlacement } from '../types';

export type GraphKind = 'snake' | 'pacman';

export function generateWorkflowYaml(kind: GraphKind, username: string): string {
  const user = username.trim() || 'your-username';

  if (kind === 'snake') {
    return `name: GitHub Snake Game

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Generate GitHub Contributions Snake Animations
        uses: Platane/snk@v3
        with:
          github_user_name: ${user}
          outputs: |
            dist/github-snake.svg
            dist/github-snake-dark.svg?palette=github-dark
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}

      - name: Deploy to Output Branch
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          publish_branch: output
          commit_message: "Update snake animation [skip ci]"`;
  }

  return `name: Generate Pac-Man

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:
  push:
    branches:
      - main

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Generate Pac-Man contribution graph SVG
        uses: abozanona/pacman-contribution-graph@main
        with:
          github_user_name: ${user}

      - name: Push Pac-Man SVG to output branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;
}

export function generateReadmeSnippet(kind: GraphKind, username: string): string {
  const user = username.trim() || 'your-username';

  if (kind === 'snake') {
    const { light, dark } = snakeGraphUrls(user);
    return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${dark}" />
  <source media="(prefers-color-scheme: light)" srcset="${light}" />
  <img alt="${user}'s GitHub Snake Contribution Graph" src="${light}" />
</picture>`;
  }

  const { light, dark } = pacmanGraphUrls(user);
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${dark}" />
  <source media="(prefers-color-scheme: light)" srcset="${light}" />
  <img alt="${user}'s Pac-Man Contribution Graph" src="${light}" />
</picture>`;
}

export function getWorkflowFilename(kind: GraphKind): string {
  return kind === 'snake' ? 'snake-graph.yml' : 'pacman-graph.yml';
}

export function getPlacementHint(placement: GraphPlacement): string {
  switch (placement) {
    case 'top':
      return 'Paste this near the top of your README.md, just below your profile header.';
    case 'middle':
      return 'Paste this in the middle of your README.md, between your intro and your stats sections.';
    default:
      return 'Paste this near the bottom of your README.md, after your other stats widgets.';
  }
}
