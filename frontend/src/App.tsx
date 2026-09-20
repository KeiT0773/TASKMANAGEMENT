import { AppHeader } from './components/AppHeader/AppHeader';
import { Board } from './components/Board/Board';

/** 画面全体。ヘッダーとボードを縦に並べる */
function App() {
  return (
    <>
      <AppHeader />
      <Board />
    </>
  );
}

export default App;
