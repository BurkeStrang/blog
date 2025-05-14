import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import Posts from "./Posts";
import Home from "./Home";
import {
  backgroundColor,
  CanvasBackground,
  GlobalStyle,
} from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import { Vector3 } from "three";
import styled from "styled-components";
import { SquareLoader } from "react-spinners";
import Profile from "./Profile";
import * as THREE from "three";

export interface Post {
  // this will be unique and will be the title of the post with dashes instead of spaces
  id: string;
  title: string;
  body: string;
  position?: THREE.Vector3;
  topics?: string[];
  date?: Date;
  comments?: string[];
}

const posts: Post[] = [
  {
    id: "1",
    title: "Mastering Vim Motions and Text Objects",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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
    id: "5",
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
    id: "6",
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
    id: "7",
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
    id: "8",
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
    id: "9",
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
    id: "10",
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
  //   {
  //     id: "11",
  //     title: "Tree Shaking & Code Splitting",
  //     body: `
  //       <p><em>Posted on April 27, 2025 by Burke</em></p>
  //
  //       <h2>What Is Tree Shaking?</h2>
  //       <p>
  //         Eliminate unused exports from your bundle to reduce size.
  //       </p>
  //
  //       <h2>Dynamic Imports for Splitting</h2>
  //       <pre><code>import(/* webpackChunkName: "moduleA" */ './moduleA')
  //   .then(({ default: moduleA }) => {
  //     moduleA.init();
  //   });
  // </code></pre>
  //
  //       <p>
  //         More on
  //         <a href="https://webpack.js.org/guides/tree-shaking/">Webpack Tree Shaking</a>
  //         and
  //         <a href="https://webpack.js.org/guides/code-splitting/">Code Splitting</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "12",
  //     title: "Introduction to React Hooks",
  //     body: `
  //       <p><em>Posted on April 26, 2025 by Burke</em></p>
  //
  //       <h2>useState & useEffect</h2>
  //       <p>
  //         Hooks let you use state and side effects in function components.
  //       </p>
  //
  //       <h2>Simple Counter Example</h2>
  //       <pre><code>import React, { useState, useEffect } from 'react';
  //
  // function Counter() {
  //   const [count, setCount] = useState(0);
  //
  //   useEffect(() => {
  //     document.title = \`Count: \${count}\`;
  //   }, [count]);
  //
  //   return (
  //     <button onClick={() => setCount(count + 1)}>
  //       You clicked {count} times
  //     </button>
  //   );
  // }
  // </code></pre>
  //
  //       <p>
  //         See the official
  //         <a href="https://reactjs.org/docs/hooks-intro.html">Hooks Intro</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "13",
  //     title: "State Management with Redux",
  //     body: `
  //       <p><em>Posted on April 25, 2025 by Burke</em></p>
  //
  //       <h2>Redux Core Concepts</h2>
  //       <ul>
  //         <li><strong>Store</strong> – holds state</li>
  //         <li><strong>Actions</strong> – describe changes</li>
  //         <li><strong>Reducers</strong> – apply changes</li>
  //       </ul>
  //
  //       <h2>Basic Counter Reducer</h2>
  //       <pre><code>const initialState = { count: 0 };
  //
  // function counterReducer(state = initialState, action) {
  //   switch (action.type) {
  //     case 'increment':
  //       return { count: state.count + 1 };
  //     default:
  //       return state;
  //   }
  // }
  // </code></pre>
  //
  //       <p>
  //         Learn more at the
  //         <a href="https://redux.js.org/introduction/getting-started">Redux Docs</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "14",
  //     title: "Using React’s Context API",
  //     body: `
  //       <p><em>Posted on April 24, 2025 by Burke</em></p>
  //
  //       <h2>When to Use Context</h2>
  //       <p>
  //         Share data (like theme or auth) without prop drilling.
  //       </p>
  //
  //       <h2>Example</h2>
  //       <pre><code>const ThemeContext = React.createContext('light');
  //
  // function App() {
  //   return (
  //     <ThemeContext.Provider value="dark">
  //       <Toolbar />
  //     </ThemeContext.Provider>
  //   );
  // }
  //
  // function Toolbar() {
  //   const theme = React.useContext(ThemeContext);
  //   return <div className={theme}>Toolbar</div>;
  // }
  // </code></pre>
  //
  //       <p>
  //         Read more at
  //         <a href="https://reactjs.org/docs/context.html">React Context</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "15",
  //     title: "Next.js Routing",
  //     body: `
  //       <p><em>Posted on April 23, 2025 by Burke</em></p>
  //
  //       <h2>File-based Routing</h2>
  //       <p>
  //         In Next.js, files in the <code>pages</code> directory become routes.
  //       </p>
  //
  //       <h2>Dynamic Routes</h2>
  //       <pre><code>// pages/posts/[id].js
  // import { useRouter } from 'next/router';
  //
  // export default function Post() {
  //   const { id } = useRouter().query;
  //   return <p>Post: {id}</p>;
  // }
  // </code></pre>
  //
  //       <p>
  //         See
  //         <a href="https://nextjs.org/docs/routing/introduction">Next.js Routing</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "16",
  //     title: "Server-Side Rendering with Next.js",
  //     body: `
  //       <p><em>Posted on April 22, 2025 by Burke</em></p>
  //
  //       <h2>getServerSideProps</h2>
  //       <p>
  //         Fetch data on each request and pre-render the page on the server.
  //       </p>
  //
  //       <h2>Example</h2>
  //       <pre><code>export async function getServerSideProps() {
  //   const res = await fetch('https://api.example.com/data');
  //   const data = await res.json();
  //   return { props: { data } };
  // }
  //
  // export default function Page({ data }) {
  //   return <div>{JSON.stringify(data)}</div>;
  // }
  // </code></pre>
  //
  //       <p>
  //         More in the
  //         <a href="https://nextjs.org/docs/basic-features/data-fetching#getserversideprops">
  //         Next.js Data Fetching</a> docs.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "17",
  //     title: "Building REST APIs with Express.js",
  //     body: `
  //       <p><em>Posted on April 21, 2025 by Burke</em></p>
  //
  //       <h2>Quick Setup</h2>
  //       <pre><code>const express = require('express');
  // const app = express();
  // app.use(express.json());
  //
  // app.get('/api/items', (req, res) => {
  //   res.json([{ id: 1, name: 'Item A' }]);
  // });
  //
  // app.post('/api/items', (req, res) => {
  //   const newItem = req.body;
  //   res.status(201).json(newItem);
  // });
  //
  // app.listen(3000, () => console.log('Server running on 3000'));
  // </code></pre>
  //
  //       <p>
  //         See the full guide in the
  //         <a href="https://expressjs.com/en/starter/basic-routing.html">Express Docs</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "18",
  //     title: "GraphQL Basics",
  //     body: `
  //       <p><em>Posted on April 20, 2025 by Burke</em></p>
  //
  //       <h2>Schema & Resolver</h2>
  //       <pre><code>const { ApolloServer, gql } = require('apollo-server');
  //
  // const typeDefs = gql\`
  //   type Query {
  //     hello: String
  //   }
  // \`;
  //
  // const resolvers = {
  //   Query: {
  //     hello: () => 'Hello world!',
  //   },
  // };
  //
  // const server = new ApolloServer({ typeDefs, resolvers });
  // server.listen();
  // \`;
  // </code></pre>
  //
  //       <p>
  //         Learn more at
  //         <a href="https://www.apollographql.com/docs/">Apollo GraphQL Docs</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "19",
  //     title: "Authentication with JWT",
  //     body: `
  //       <p><em>Posted on April 19, 2025 by Burke</em></p>
  //
  //       <h2>Issue & Verify Token</h2>
  //       <pre><code>const jwt = require('jsonwebtoken');
  //
  // function login(req, res) {
  //   const user = { id: 1, name: 'Burke' };
  //   const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  //   res.json({ token });
  // }
  //
  // function authenticate(req, res, next) {
  //   const token = req.headers.authorization?.split(' ')[1];
  //   try {
  //     req.user = jwt.verify(token, process.env.JWT_SECRET);
  //     next();
  //   } catch {
  //     res.sendStatus(401);
  //   }
  // }
  // </code></pre>
  //
  //       <p>
  //         More on JSON Web Tokens at
  //         <a href="https://jwt.io/introduction/">jwt.io</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "20",
  //     title: "Web Accessibility (ARIA)",
  //     body: `
  //       <p><em>Posted on April 18, 2025 by Burke</em></p>
  //
  //       <h2>ARIA Roles & Attributes</h2>
  //       <ul>
  //         <li><code>role="button"</code> – announce element as button</li>
  //         <li><code>aria-label="Close"</code> – provide accessible name</li>
  //         <li><code>aria-live="polite"</code> – announce region updates</li>
  //       </ul>
  //
  //       <h2>Best Practices</h2>
  //       <ul>
  //         <li>Use semantic HTML first</li>
  //         <li>Ensure keyboard navigation</li>
  //         <li>Provide meaningful alt text</li>
  //       </ul>
  //
  //       <p>
  //         WCAG guidelines at
  //         <a href="https://www.w3.org/WAI/standards-guidelines/wcag/">W3C WCAG</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "21",
  //     title: "Progressive Web Apps",
  //     body: `
  //       <p><em>Posted on April 17, 2025 by Burke</em></p>
  //
  //       <h2>Key Features</h2>
  //       <ul>
  //         <li>Service Worker for offline support</li>
  //         <li>Web App Manifest for installability</li>
  //         <li>HTTPS requirement</li>
  //       </ul>
  //
  //       <h2>Manifest Example</h2>
  //       <pre><code>{
  //   "name": "My PWA",
  //   "short_name": "App",
  //   "start_url": "/",
  //   "display": "standalone",
  //   "icons": [
  //     {
  //       "src": "/icon.png",
  //       "sizes": "192x192",
  //       "type": "image/png"
  //     }
  //   ]
  // }
  // </code></pre>
  //
  //       <p>
  //         Get started with
  //         <a href="https://web.dev/progressive-web-apps/">web.dev PWAs</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "22",
  //     title: "Service Workers Deep Dive",
  //     body: `
  //       <p><em>Posted on April 16, 2025 by Burke</em></p>
  //
  //       <h2>Registering a Worker</h2>
  //       <pre><code>if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker
  //     .register('/sw.js')
  //     .then(() => console.log('SW registered'));
  // }
  // </code></pre>
  //
  //       <h2>Caching Strategy</h2>
  //       <pre><code>self.addEventListener('fetch', event => {
  //   event.respondWith(
  //     caches.match(event.request)
  //       .then(res => res || fetch(event.request))
  //   );
  // });
  // </code></pre>
  //
  //       <p>
  //         Learn caching patterns at
  //         <a href="https://developers.google.com/web/fundamentals/primers/service-workers">
  //         Google Developers</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "23",
  //     title: "WebSockets for Real-Time",
  //     body: `
  //       <p><em>Posted on April 15, 2025 by Burke</em></p>
  //
  //       <h2>Socket.IO Example</h2>
  //       <pre><code>const io = require('socket.io')(3000);
  //
  // io.on('connection', socket => {
  //   console.log('Client connected');
  //   socket.on('message', msg => {
  //     io.emit('message', msg);
  //   });
  // });
  // </code></pre>
  //
  //       <p>
  //         Official docs at
  //         <a href="https://socket.io/docs/v4/">Socket.IO</a>.
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "24",
  //     title: "Dockerizing a Node.js App",
  //     body: `
  //       <p><em>Posted on April 14, 2025 by Burke</em></p>
  //
  //       <h2>Dockerfile</h2>
  //       <pre><code>FROM node:18-alpine
  // WORKDIR /app
  // COPY package*.json ./
  // RUN npm install --production
  // COPY . .
  // CMD ["node", "server.js"]
  // </code></pre>
  //
  //       <p>
  //         Build and run:
  //         <code>docker build -t my-app . &amp;&amp; docker run -p 3000:3000 my-app</code>
  //       </p>
  //     `,
  //   },
  //   {
  //     id: "25",
  //     title: "CI with GitHub Actions",
  //     body: `
  //       <p><em>Posted on April 13, 2025 by Burke</em></p>
  //
  //       <h2>Workflow File</h2>
  //       <pre><code>name: CI
  //
  // on:
  //   push:
  //     branches: [ main ]
  //
  // jobs:
  //   build:
  //     runs-on: ubuntu-latest
  //     steps:
  //       - uses: actions/checkout@v3
  //       - name: Install Dependencies
  //         run: npm ci
  //       - name: Run Tests
  //         run: npm test
  // </code></pre>
  //
  //       <p>
  //         See
  //         <a href="https://docs.github.com/actions">GitHub Actions Docs</a>.
  //       </p>
  //     `,
  //   },
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

const App: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  const handlePostClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) setSelectedPost(post);
  };

  const handleClose = () => setSelectedPost(null);

  return (
    <>
      <GlobalStyle />
      {/* 1️⃣ Always mount the 3D canvas so onLoaded can fire */}
      <CanvasBackground>
        <OceanDemoCanvas
          posts={posts}
          onPostClick={handlePostClick}
          onLoaded={() => setCanvasLoaded(true)}
        />
      </CanvasBackground>

      {/* 2️⃣ While loading, show only the overlay & spinners */}
      {!canvasLoaded && (
        <LoaderOverlay>
          <SquareLoader
            loading
            size={55}
            color="#36D7B7"
            speedMultiplier={1}
            cssOverride={{
              border: "2px solid #202020",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#36D7B7"
            speedMultiplier={1}
            cssOverride={{
              border: "2px solid #202020",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#36D7B7"
            speedMultiplier={1}
            cssOverride={{
              border: "2px solid #202020",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#36D7B7"
            speedMultiplier={1}
            cssOverride={{
              border: "2px solid #202020",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
        </LoaderOverlay>
      )}

      {/* 3️⃣ Once loaded, render the rest of the app */}
      {canvasLoaded && (
        <>
          <Router>
            <Header />
            <Routes>
              <Route path="/about" element={<Home />} />
              <Route
                path="/posts"
                element={
                  <div style={{background: backgroundColor}}>
                    <Posts
                      selectedPost={selectedPost}
                      handleClose={handleClose}
                    />
                  </div>
                }
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
            </Routes>
          </Router>
        </>
      )}
    </>
  );
};

export default App;
