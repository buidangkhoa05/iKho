import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should default to light theme', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });

  it('should update the signal and persist to localStorage when setTheme is called', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('ikho.theme')).toBe('dark');
  });

  it('should set the data-theme attribute on the document element', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should read a previously stored theme on initialization', () => {
    localStorage.setItem('ikho.theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });
});
