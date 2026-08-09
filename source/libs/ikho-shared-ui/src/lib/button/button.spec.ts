import { TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render as a button element', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });
});
