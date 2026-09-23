/* ============================================================================
   ROOT
   Owns the session and top-level navigation: sign-in, then the role-scoped
   shell with the catalog, transcript, or an open course.

   The session lives in a ref the api reads through getSession(), so identity
   always comes from the signed-in session (playbook 10.2), never a lookup.
   ============================================================================ */

import React, { useState, useRef } from 'react';
import { createApi } from './api/index.js';
import Shell from './components/Shell.jsx';
import SignIn from './screens/SignIn.jsx';
import Catalog from './screens/Catalog.jsx';
import CoursePlayer from './screens/CoursePlayer.jsx';
import Transcript from './screens/Transcript.jsx';

export default function App() {
  const sessionRef = useRef(null);
  // Lazy init: one api (and one mock store) for the life of the app.
  const [api] = useState(() => createApi(() => sessionRef.current));

  const [session, setSession] = useState(null); // {token, profile}
  const [tab, setTab] = useState('catalog');
  const [openCourse, setOpenCourse] = useState(null);

  const onSignedIn = (token, profile) => {
    sessionRef.current = { token, profile };
    setSession({ token, profile });
    setTab('catalog');
  };
  const onSignOut = () => {
    sessionRef.current = null;
    setSession(null);
    setOpenCourse(null);
  };

  if (!session) return <SignIn api={api} onSignedIn={onSignedIn} />;

  return (
    <Shell profile={session.profile} onSignOut={onSignOut} tab={tab} setTab={setTab}>
      {openCourse ? (
        <CoursePlayer api={api} courseId={openCourse} onExit={() => setOpenCourse(null)} />
      ) : tab === 'catalog' ? (
        <Catalog api={api} onOpen={setOpenCourse} />
      ) : (
        <Transcript api={api} profile={session.profile} />
      )}
    </Shell>
  );
}
