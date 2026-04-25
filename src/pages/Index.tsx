/**
 * LEARNER'S NOTE:
 * Index.tsx is a simple placeholder page that serves as a fallback when
 * no other route matches. It displays a basic "Welcome to Your Blank App" message.
 * This is a fallback page - the actual routing shows Landing.tsx at "/" via App.tsx.
 */
const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
