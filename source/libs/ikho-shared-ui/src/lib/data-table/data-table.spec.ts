import { TestBed } from '@angular/core/testing';
import { DataTable } from './data-table';

describe('DataTable', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTable],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [{ key: 'name', label: 'Name' }]);
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one row per item', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [{ key: 'name', label: 'Name' }]);
    fixture.componentRef.setInput('rows', [{ name: 'A' }, { name: 'B' }]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('should render the empty label when there are no rows', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [{ key: 'name', label: 'Name' }]);
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No results');
  });
});
