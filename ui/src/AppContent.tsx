import React, { useState } from "react";
import {
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Header from "./Header";
import Posts from "./Posts";
import About from "./About";
import {
  backgroundColor,
  CanvasBackground,
  GlobalStyle,
  primary,
} from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import styled from "styled-components";
import { SquareLoader } from "react-spinners";
import Profile from "./Profile";
import * as THREE from "three";
import PostDetail from "./PostDetail";

export interface Post {
  // this will be unique and will be the title of the post with dashes instead of spaces
  slug: string;
  title: string;
  body: string;
  position?: THREE.Vector3;
  date?: Date;
}

const posts: Post[] = [
  {
    slug: "mastering-vim-motions-and-text-objects",
    title: "MASTERING VIM MOTIONS AND TEXT OBJECTS",
    body: `
      <p><em>Posted on May 7, 2025 by Burke</em></p>

      <h2>What Are Motions?</h2>
      <p>
        Motions in Vim are commands that move the cursor. They're used to
        tell other commands (like <code>d</code> for delete or <code>y</code> for yank) how much text to act on.
        For example, <code>d$</code> means "delete to the end of the line".
      </p>
      <ul>
        <li><code>w</code> – next word</li>
        <li><code>e</code> – end of word</li>
        <li><code>0</code> – beginning of line</li>
        <li><code>$</code> – end of line</li>
        <li><code>gg</code> – beginning of file</li>
        <li><code>G</code> – end of file</li>
      </ul>

      <h2>What Are Text Objects?</h2>
      <p>
        Text objects are more semantic than motions. They represent structured selections like
        "a word", "a sentence", "a paragraph", or "a block inside quotes".
      </p>
      <p>
        Text objects usually follow the pattern <code>operator + a/i + object</code>.
      </p>
      <ul>
        <li><code>diw</code> – delete inner word (just the word)</li>
        <li><code>daw</code> – delete a word (including whitespace)</li>
        <li><code>ci"</code> – change inner quotes</li>
        <li><code>ca(</code> – change a parenthesis block (includes parens)</li>
        <li><code>yi]</code> – yank inside square brackets</li>
      </ul>
      <p>Think of <code>i</code> as "inner" and <code>a</code> as "around".</p>

      <h2>Combining Motions and Operators</h2>
      <p>
        You can combine motions and text objects with operators like:
      </p>
      <ul>
        <li><code>d</code> – delete</li>
        <li><code>y</code> – yank (copy)</li>
        <li><code>c</code> – change</li>
        <li><code>v</code> – visual select</li>
      </ul>

      <p>Examples:</p>
      <pre><code>d3w    "delete three words"
y$     "yank to end of line"
caw    "change a word including whitespace"
vi"    "select inner quotes"</code></pre>

      <p>Need a printable Vim cheatsheet? <a href="https://vim.rtorr.com/">Check this out</a>.</p>
    `,
  },
  {
    slug: "2",
    title:
      "Scott Hanselman's 2021 Ultimate Developer and Power Users Tool List for Windows",
    body: `
      <p><em>Posted on May 6, 2025 by Burke</em></p>

      <h2>What Is CSS Grid?</h2>
      <p>
        CSS Grid Layout is a two-dimensional system that lets you design grid-based layouts
        with rows and columns. It’s perfect for complex, responsive designs.
      </p>
      <ul>
        <li><code>display: grid;</code> – defines a grid container</li>
        <li><code>grid-template-columns</code> – defines column sizes</li>
        <li><code>grid-template-rows</code> – defines row sizes</li>
        <li><code>gap</code> – spacing between grid items</li>
      </ul>

      <h2>Basic Example</h2>
      <pre><code>.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.item {
  background: #eee;
  padding: 8px;
}
</code></pre>

      <p>
        For a deep dive, check out
        <a href="https://css-tricks.com/snippets/css/complete-guide-grid/">The Complete Guide to CSS Grid</a>.
      </p>
    `,
  },
  {
    slug: "3",
    title: "Flexbox in CSS",
    body: `
      <p><em>Posted on May 5, 2025 by Burke</em></p>

      <h2>Why Flexbox?</h2>
      <p>
        Flexbox is a one-dimensional layout model for distributing space along a row or column.
        It’s ideal for toolbars, menus, and even responsive card layouts.
      </p>
      <ul>
        <li><code>display: flex;</code> – creates a flex container</li>
        <li><code>justify-content</code> – horizontal alignment</li>
        <li><code>align-items</code> – vertical alignment</li>
        <li><code>flex-grow</code> – how items expand</li>
      </ul>

      <h2>Simple Flex Container</h2>
      <pre><code>.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item {
  flex: 1;
  margin: 4px;
}
</code></pre>

      <p>
        Learn more at
        <a href="https://css-tricks.com/snippets/css/a-guide-to-flexbox/">A Guide to Flexbox</a>.
      </p>
    `,
  },
  {
    slug: "4",
    title: "Responsive Web Design",
    body: `
      <p><em>Posted on May 4, 2025 by Burke</em></p>

      <h2>Fluid Layouts & Media Queries</h2>
      <p>
        Responsive design ensures your site looks great on all devices. Combine fluid grids
        with media queries to adapt layouts.
      </p>
      <ul>
        <li>Use percentage or <code>fr</code> units for widths</li>
        <li>
          Media queries: <code>@media (max-width: 600px) { … }</code>
        </li>
        <li>Mobile-first: write styles for small screens first</li>
      </ul>

      <h2>Example</h2>
      <pre><code>@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .content {
    width: 100%;
  }
}
</code></pre>

      <p>
        Read Ethan Marcotte’s original article on
        <a href="https://alistapart.com/article/responsive-web-design/">Responsive Web Design</a>.
      </p>
    `,
  },
  {
    slug: "5",
    title: "JavaScript Promises",
    body: `
      <p><em>Posted on May 3, 2025 by Burke</em></p>

      <h2>Promise States</h2>
      <p>
        A Promise represents an asynchronous operation. It can be in one of three states:
      </p>
      <ul>
        <li>Pending</li>
        <li>Fulfilled</li>
        <li>Rejected</li>
      </ul>

      <h2>Creating a Promise</h2>
      <pre><code>const wait = ms => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

wait(1000)
  .then(() => console.log('Done!'))
  .catch(err => console.error(err));
</code></pre>

      <p>
        For more, see
        <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">
        MDN: Using Promises</a>.
      </p>
    `,
  },
  {
    slug: "6",
    title: "Async/Await in JavaScript",
    body: `
      <p><em>Posted on May 2, 2025 by Burke</em></p>

      <h2>Syntactic Sugar over Promises</h2>
      <p>
        <code>async</code> functions return Promises. Use <code>await</code> inside to pause
        execution until the Promise resolves.
      </p>

      <h2>Example</h2>
      <pre><code>async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const json = await response.json();
    console.log(json);
  } catch (err) {
    console.error('Error:', err);
  }
}

fetchData();
</code></pre>

      <p>
        Dive deeper in the
        <a href="https://javascript.info/async-await">JavaScript Info Async/Await</a> guide.
      </p>
    `,
  },
  {
    slug: "7",
    title: "TypeScript Generics",
    body: `
      <p><em>Posted on May 1, 2025 by Burke</em></p>

      <h2>What Are Generics?</h2>
      <p>
        Generics allow you to write reusable, type-safe functions and classes by
        parameterizing types.
      </p>

      <h2>Generic Function Example</h2>
      <pre><code>function identity<T>(arg: T): T {
  return arg;
}

const str = identity<string>('hello');
const num = identity<number>(42);
</code></pre>

      <p>
        Check out the official
        <a href="https://www.typescriptlang.org/docs/handbook/generics.html">
        TypeScript Generics Handbook</a>.
      </p>
    `,
  },
  {
    slug: "8",
    title: "Node.js Streams",
    body: `
      <p><em>Posted on April 30, 2025 by Burke</em></p>

      <h2>Stream Types</h2>
      <ul>
        <li>Readable</li>
        <li>Writable</li>
        <li>Duplex</li>
        <li>Transform</li>
      </ul>

      <h2>Read a File Stream</h2>
      <pre><code>const fs = require('fs');
const readStream = fs.createReadStream('./large-file.txt', 'utf8');

readStream.on('data', chunk => {
  console.log('Received chunk:', chunk);
});
</code></pre>

      <p>
        Learn more about
        <a href="https://nodejs.org/api/stream.html">Node.js Streams</a>.
      </p>
    `,
  },
  {
    slug: "9",
    title: "Setting Up ESLint & Prettier",
    body: `
      <p><em>Posted on April 29, 2025 by Burke</em></p>

      <h2>Configuration</h2>
      <pre><code>{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"]
   }
   </code></pre>

      <h2>Scripts</h2>
      <p>Add to <code>package.json</code>:</p>
      <pre><code>"scripts": {
  "lint": "eslint 'src/**/*.{js,ts,tsx}'",
  "format": "prettier --write 'src/**/*.{js,ts,tsx,css,md}'"
   }
   </code></pre>

      <p>
        See the <a href="https://eslint.org/docs">ESLint docs</a> and
        <a href="https://prettier.io/docs">Prettier docs</a>.
      </p>
    `,
  },
  {
    slug: "10",
    title: "Webpack Configuration Basics",
    body: `
      <p><em>Posted on April 28, 2025 by Burke</em></p>

      <h2>Core Concepts</h2>
      <ul>
        <li><code>entry</code> – starting point</li>
        <li><code>output</code> – bundled file location</li>
        <li><code>loaders</code> – transform files</li>
        <li><code>plugins</code> – extend functionality</li>
      </ul>

      <h2>Minimal Config</h2>
      <pre><code>const path = require('path');

   module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ],
  },
   };
   </code></pre>

      <p>
        For detailed options, see
        <a href="https://webpack.js.org/concepts/configuration/">Webpack Docs</a>.
      </p>
    `,
  },
];

const LoaderOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${backgroundColor};
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AppContent: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  const handlePostClick = (slug: string) => {
    const post = posts.find((p) => p.slug === slug);
    if (post) setSelectedPost(post);
  };

  const handleClose = () => setSelectedPost(null);

  const location = useLocation();
  // hide whenever the path is /posts/:slug
  const isDetail = /^\/posts\/[^/]+$/.test(location.pathname);

  return (
    <>
      <GlobalStyle />
      {!isDetail && (
        <CanvasBackground>
          <OceanDemoCanvas
            posts={posts}
            onPostClick={handlePostClick}
            onLoaded={() => setCanvasLoaded(true)}
          />
        </CanvasBackground>
      )}
      {!canvasLoaded && (
        <LoaderOverlay>
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
        </LoaderOverlay>
      )}
      {canvasLoaded && (
        <>
          <Header />
          <Routes>
            <Route path="/about" element={<About />} />
            <Route
              path="/posts"
              element={
                <Posts selectedPost={selectedPost} handleClose={handleClose} />
              }
            />

            <Route
              path="/posts/:slug"
              element={<PostDetail allPosts={posts} />}
            />
            <Route
              path="/profile"
              element={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "1.5rem 2.5rem 1.5rem 1.5rem",
                  }}
                >
                  <Profile
                    avatarUrl="https://i.pinimg.com/236x/14/67/d2/1467d25dddb40deda97737c62b375d9a.jpg"
                    name="Jane Doe"
                    title="Full-Stack Developer"
                    bio="Passionate about building performant web apps and scalable APIs."
                  />
                </div>
              }
            />
            <Route path="/*" element={<div>Page not found</div>} />
          </Routes>
        </>
      )}
    </>
  );
};

export default AppContent;
