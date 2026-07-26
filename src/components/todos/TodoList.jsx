export default function TodoList() {
  const todos = [
    {
      id: 1,
      title: "Test React migration",
      completed: false,
    },
  ];

  return (
    <section>
      {todos.map((todo) => (
        <article key={todo.id}>
          <h3>{todo.title}</h3>
        </article>
      ))}
    </section>
  );
}
