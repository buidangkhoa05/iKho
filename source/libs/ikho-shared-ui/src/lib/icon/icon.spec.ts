import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('Icon', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Icon],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'package');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render an svg element', () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'package');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg')).toBeTruthy();
  });

  it('should fall back to the package icon for an unknown name', () => {
    const known = TestBed.createComponent(Icon);
    known.componentRef.setInput('name', 'package');
    known.detectChanges();

    const unknown = TestBed.createComponent(Icon);
    unknown.componentRef.setInput('name', 'does-not-exist');
    unknown.detectChanges();

    expect(unknown.componentInstance.elements()).toEqual(known.componentInstance.elements());
  });
});
