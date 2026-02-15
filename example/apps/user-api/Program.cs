using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Middleware
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

// In-memory user store
var users = new ConcurrentDictionary<int, User>();
var nextId = 1;

// Seed demo data
users.TryAdd(1, new User(1, "Alice Johnson", "alice@example.com", "Admin"));
users.TryAdd(2, new User(2, "Bob Smith", "bob@example.com", "Developer"));
users.TryAdd(3, new User(3, "Charlie Brown", "charlie@example.com", "Designer"));
nextId = 4;

// Routes
app.MapGet("/users", () => users.Values.ToList())
   .WithName("GetUsers")
   .WithOpenApi();

app.MapGet("/users/{id}", (int id) =>
    users.TryGetValue(id, out var user) 
        ? Results.Ok(user) 
        : Results.NotFound())
   .WithName("GetUser")
   .WithOpenApi();

app.MapPost("/users", (CreateUserRequest request) =>
{
    var id = Interlocked.Increment(ref nextId) - 1;
    var user = new User(id, request.Name, request.Email, request.Role);
    users.TryAdd(id, user);
    return Results.Created($"/users/{id}", user);
})
.WithName("CreateUser")
.WithOpenApi();

app.MapPut("/users/{id}", (int id, CreateUserRequest request) =>
{
    if (!users.ContainsKey(id))
        return Results.NotFound();
    
    var user = new User(id, request.Name, request.Email, request.Role);
    users[id] = user;
    return Results.Ok(user);
})
.WithName("UpdateUser")
.WithOpenApi();

app.MapDelete("/users/{id}", (int id) =>
{
    return users.TryRemove(id, out _) 
        ? Results.NoContent() 
        : Results.NotFound();
})
.WithName("DeleteUser")
.WithOpenApi();

app.MapGet("/health", () => new { status = "healthy", service = "user-api" })
   .WithName("Health");

Console.WriteLine("🚀 User API running on http://localhost:5000");
app.Run("http://localhost:5000");

// Records
record User(int Id, string Name, string Email, string Role);
record CreateUserRequest(string Name, string Email, string Role);
