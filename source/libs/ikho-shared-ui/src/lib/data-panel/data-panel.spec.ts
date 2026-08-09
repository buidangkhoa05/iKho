import { TestBed } from '@angular/core/testing';
import { DataPanel } from './data-panel';

describe('DataPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataPanel],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DataPanel);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the title when provided', () => {
    const fixture = TestBed.createComponent(DataPanel);
    fixture.componentRef.setInput('title', 'Inventory');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Inventory');
  });
});
