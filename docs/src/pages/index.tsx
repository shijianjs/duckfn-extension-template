import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';

import {
  ArrowRightIcon,
  BracesIcon,
  GitHubIcon,
  HashIcon,
  LifeBuoyIcon,
  PackageIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/icons';
import styles from './index.module.css';

/**
 * The landing page: hero, features, a Rust/SQL showcase and the "where next"
 * cards. Laid out like the VitePress home (centred hero, feature grid, code
 * sample) but built from the theme's own primitives — `Layout`, `Heading`,
 * `CodeBlock` — and from Infima variables, so light and dark mode come for free
 * and nothing overrides the docs pages.
 *
 * Copy lives in `<Translate>` so both locales stay in sync; the Chinese strings
 * are in `i18n/zh-Hans/code.json` under the same `homepage.*` keys.
 *
 * 首页：主视觉、特性卡片、Rust/SQL 代码展示与「接下来去哪」的链接卡。文案都放在
 * `<Translate>` 里，两种语言的对应关系见 `i18n/zh-Hans/code.json` 的 `homepage.*` 键。
 */

/** Icons only need a class name: colour comes from `currentColor`. */
type IconComponent = (props: {className?: string}) => ReactNode;

/**
 * Kept out of the JSX below on purpose: a template literal written inline would
 * carry the JSX indentation into the rendered code block. The sample is the
 * template's own `my_greet_checked` (src/extension/functions/scalar_greet.rs),
 * trimmed to the parts worth showing.
 */
const RUST_SAMPLE = `use duckfn::{DuckOptionResult, duck_error, duck_scalar_function};

/// A DuckDB scalar function: one attribute, one ordinary Rust function.
#[duck_scalar_function(
    description = "Greets someone by name, returning NULL for an empty name",
    example = "SELECT my_greet_checked('world')"
)]
fn my_greet_checked(name: String) -> DuckOptionResult<String> {
    if name.is_empty() {
        return Ok(None);          // SQL NULL
    }
    if name.trim() != name {
        return Err(duck_error("no surrounding whitespace"));  // fails the query
    }
    Ok(Some(format!("Hello, {name}!")))
}`;

/** The SQL half of the showcase: the whole interface, with no glue in sight. */
const SQL_SAMPLE = `-- a locally built extension loads with -unsigned
LOAD './target/debug/my_extension.duckdb_extension';

SELECT my_greet_checked('world');  -- Hello, world!
SELECT my_greet_checked('');       -- NULL
SELECT my_greet_checked(' x ');    -- error: no surrounding whitespace`;

const FEATURES: {
  key: string;
  Icon: IconComponent;
  title: ReactNode;
  details: ReactNode;
}[] = [
  {
    key: 'noGlue',
    Icon: SparklesIcon,
    title: (
      <Translate
        id="homepage.features.noGlue.title"
        description="Home page feature card title">
        No C/C++ glue code
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.noGlue.details"
        description="Home page feature card description">
        An attribute macro turns an ordinary Rust function into a DuckDB scalar,
        aggregate or table function. DuckDB's C types never appear in your code.
      </Translate>
    ),
  },
  {
    key: 'build',
    Icon: PackageIcon,
    title: (
      <Translate
        id="homepage.features.build.title"
        description="Home page feature card title">
        No local DuckDB build
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.build.details"
        description="Home page feature card description">
        Headers only, dispatched through DuckDB's API table at load time, so one
        cargo command produces the .duckdb_extension — no CMake, no C++
        toolchain.
      </Translate>
    ),
  },
  {
    key: 'tests',
    Icon: ShieldCheckIcon,
    title: (
      <Translate
        id="homepage.features.tests.title"
        description="Home page feature card title">
        Tests on every pull request
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.tests.details"
        description="Home page feature card description">
        SQLLogicTest files in test/sql with three examples already written, and a
        CI job that builds and runs them for every supported platform.
      </Translate>
    ),
  },
  {
    key: 'release',
    Icon: HashIcon,
    title: (
      <Translate
        id="homepage.features.release.title"
        description="Home page feature card title">
        Tag a release, get binaries
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.release.details"
        description="Home page feature card description">
        Bumping, committing and tagging is all it takes: the pipeline builds
        every platform and attaches the .duckdb_extension files to a GitHub
        Release.
      </Translate>
    ),
  },
  {
    key: 'types',
    Icon: BracesIcon,
    title: (
      <Translate
        id="homepage.features.types.title"
        description="Home page feature card title">
        Plain Rust types
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.types.details"
        description="Home page feature card description">
        Option, Vec, IndexMap and derived structs and enums map to DuckDB's
        LIST, MAP, ARRAY and STRUCT — nesting included.
      </Translate>
    ),
  },
  {
    key: 'docs',
    Icon: LifeBuoyIcon,
    title: (
      <Translate
        id="homepage.features.docs.title"
        description="Home page feature card title">
        This documentation site
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.features.docs.details"
        description="Home page feature card description">
        Docusaurus in docs/, bilingual (English and Simplified Chinese), with a
        workflow that publishes it to GitHub Pages on every version tag. Delete
        it if you do not want it.
      </Translate>
    ),
  },
];

const NEXT_STEPS: {to: string; title: ReactNode; details: ReactNode}[] = [
  {
    to: '/docs/getting-started/quick-start',
    title: (
      <Translate
        id="homepage.next.quickStart.title"
        description="Home page link card title">
        Quick start
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.next.quickStart.details"
        description="Home page link card description">
        Rename the template, build it and call the sample functions from SQL.
      </Translate>
    ),
  },
  {
    to: '/docs/getting-started/project-structure',
    title: (
      <Translate
        id="homepage.next.structure.title"
        description="Home page link card title">
        Project structure
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.next.structure.details"
        description="Home page link card description">
        Where the entry point, the functions and the SQL types live.
      </Translate>
    ),
  },
  {
    to: '/docs/guide/functions',
    title: (
      <Translate
        id="homepage.next.functions.title"
        description="Home page link card title">
        Writing functions
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.next.functions.details"
        description="Home page link card description">
        The sample functions line by line, and what to copy when you add your
        own.
      </Translate>
    ),
  },
  {
    to: '/docs/build-and-release',
    title: (
      <Translate
        id="homepage.next.release.title"
        description="Home page link card title">
        Build and release
      </Translate>
    ),
    details: (
      <Translate
        id="homepage.next.release.details"
        description="Home page link card description">
        The two build paths, the release flow and the wasm target.
      </Translate>
    ),
  },
];

/**
 * The shields.io badges ask for `style=flat`, which is the rounded style; the
 * default `flat-square` draws square corners and would clash with the language
 * badges below, which are rounded too. The row has to look like one set, so the
 * shape is decided at the source rather than patched with CSS.
 *
 * 徽章：`<owner>/<repo>` 还没填时（`REPO_URL` 仍是占位符）只显示不依赖仓库地址的三枚，
 * 免得首页挂着一排坏图。
 */
function badges(repoUrl: string) {
  const repoSlug = repoUrl.replace(/^https:\/\/github\.com\//, '');
  const hasRepo = !repoSlug.includes('<');

  return [
    ...(hasRepo
      ? [
          {
            href: `${repoUrl}/releases`,
            src: `https://img.shields.io/github/v/release/${repoSlug}?style=flat`,
            alt: 'Latest release',
          },
        ]
      : []),
    {
      href: 'https://github.com/shijianjs/duckfn-extension-template/blob/main/LICENSE',
      src: 'https://img.shields.io/badge/license-MIT-14459b.svg?style=flat',
      alt: 'MIT license',
    },
    {
      href: 'https://rust-lang.org',
      src: 'https://img.shields.io/badge/Rust-1.86%2B-14459b.svg?style=flat',
      alt: 'Rust 1.86 or newer',
    },
    {
      href: 'https://duckdb.org',
      src: 'https://img.shields.io/badge/DuckDB-1.5%2B-14459b.svg?style=flat',
      alt: 'DuckDB 1.5 or newer',
    },
  ];
}

function Hero(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const repoUrl = siteConfig.customFields?.repoUrl as string;
  // Not a hard-coded "/img/...": a project site is published under /<repo>/ on GitHub Pages, and only
  // useBaseUrl adds that prefix.
  const logoUrl = useBaseUrl('img/logo.svg');

  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        {/* The <h1> below spells out the name, so the mark is decorative. */}
        <span className={styles.logoStage}>
          <img
            className={styles.logo}
            src={logoUrl}
            alt=""
            width={480}
            height={480}
          />
        </span>
        <Heading as="h1" className={styles.title}>
          {siteConfig.title}
        </Heading>
        <p className={styles.tagline}>
          <Translate id="homepage.tagline">{siteConfig.tagline}</Translate>
        </p>
        <div className={styles.actions}>
          <Link className={styles.buttonPrimary} to="/docs/intro">
            <Translate id="homepage.getStarted">Get started</Translate>
          </Link>
          <Link
            className={styles.buttonSecondary}
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer">
            <GitHubIcon className={styles.buttonIcon} />
            <Translate id="homepage.github" description="Home page button linking to the repository">
              GitHub
            </Translate>
          </Link>
        </div>
        <div className={styles.badges}>
          {badges(repoUrl).map((badge) => (
            <Link
              className={styles.badge}
              href={badge.href}
              key={badge.src}
              target="_blank"
              rel="noopener noreferrer">
              <img className={styles.badgeImage} src={badge.src} alt={badge.alt} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate
            id="homepage.features.title"
            description="Home page section title above the feature cards">
            What the template gives you
          </Translate>
        </Heading>
        <div className={styles.featureGrid}>
          {FEATURES.map(({key, Icon, title, details}) => (
            <article className={styles.featureCard} key={key}>
              <span className={styles.featureIconChip}>
                <Icon className={styles.featureIcon} />
              </span>
              <Heading as="h3" className={styles.featureTitle}>
                {title}
              </Heading>
              <p className={styles.featureDetails}>{details}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeShowcase(): ReactNode {
  return (
    <section className={styles.sectionTint}>
      <div className={styles.sectionInner}>
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate
            id="homepage.showcase.title"
            description="Home page section title above the Rust and SQL code blocks">
            One attribute = one SQL function
          </Translate>
        </Heading>
        <p className={styles.sectionLead}>
          <Translate
            id="homepage.showcase.lead"
            description="Home page paragraph introducing the Rust and SQL code blocks">
            The attribute generates the FFI wrapper, the column readers and
            writers, and the registration code. Everything on the left is safe
            Rust that you could have written for a plain library — it is the
            template's own sample, not a sketch.
          </Translate>
        </p>
        <div className={styles.codeGrid}>
          <CodeBlock language="rust" title="src/extension/functions/scalar_greet.rs">
            {RUST_SAMPLE}
          </CodeBlock>
          <div className={styles.codeColumn}>
            <CodeBlock language="sql" title="duckdb -unsigned">
              {SQL_SAMPLE}
            </CodeBlock>
            {/* Balances the two columns, and explains the trailing comments. */}
            <p className={styles.codeCaption}>
              <Translate
                id="homepage.showcase.caption"
                description="Home page note under the SQL code block explaining the trailing comments">
                The comments are what each call returns. Loading needs -unsigned,
                because the extension talks to DuckDB's C API.
              </Translate>
            </p>
          </div>
        </div>
        <p className={styles.showcaseLinkRow}>
          <Link className={styles.showcaseLink} to="/docs/guide/functions">
            <Translate
              id="homepage.showcase.link"
              description="Home page link to the functions guide">
              The sample functions, line by line
            </Translate>
            <ArrowRightIcon className={styles.showcaseLinkArrow} />
          </Link>
        </p>
      </div>
    </section>
  );
}

function NextSteps(): ReactNode {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate
            id="homepage.next.title"
            description="Home page section title above the link cards">
            Where to go next
          </Translate>
        </Heading>
        <div className={styles.nextGrid}>
          {NEXT_STEPS.map(({to, title, details}) => (
            <Link className={styles.nextCard} key={to} to={to}>
              <span className={styles.nextCardBody}>
                <span className={styles.nextCardTitle}>{title}</span>
                <span className={styles.nextCardDetails}>{details}</span>
              </span>
              <ArrowRightIcon className={styles.nextCardArrow} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Documentation for this DuckDB extension: building it, the functions it registers, and how it is released.">
      {/* Layout renders no <main> of its own: this is the page's only one. */}
      <main>
        <Hero />
        <Features />
        <CodeShowcase />
        <NextSteps />
      </main>
    </Layout>
  );
}
