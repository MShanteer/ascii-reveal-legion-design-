import { renderToString } from 'react-dom/server';
import { Doc } from './app.jsx';

export const html = () => '<!DOCTYPE html>' + renderToString(<Doc />);
