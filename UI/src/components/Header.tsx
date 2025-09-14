import logoWithText from '/logo_with_text.svg';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 z-50 p-4">
      <img 
        src={logoWithText} 
        alt="Tavily Logo" 
        className="h-10 w-auto"
      />
    </header>
  );
};

export default Header; 